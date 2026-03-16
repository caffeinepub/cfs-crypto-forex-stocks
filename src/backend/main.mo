import List "mo:core/List";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  let accessControlState = AccessControl.initState();

  include MixinAuthorization(accessControlState);

  type KYCStatus = {
    #verified;
    #unverified;
    #pending;
    #banned;
  };

  type AssetType = {
    #crypto;
    #forex;
    #stock;
  };

  type Trade = {
    asset : Text;
    assetType : AssetType;
    tradeType : { #buy; #sell };
    amount : Float;
    price : Float;
    timestamp : Int;
  };

  module Trade {
    public func compareByTimestamp(a : Trade, b : Trade) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  type PortfolioView = {
    holdings : [(Text, Float)];
    totalValue : Float;
  };

  type AssetData = {
    name : Text;
    assetType : AssetType;
    price : Float;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    mobile : Text;
    age : Nat;
    aadhaarMock : Text;
    panMock : Text;
    registrationTime : Int;
    kycStatus : KYCStatus;
    isTaxFree : Bool;
    trialEndTime : ?Int;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userTrades = Map.empty<Principal, List.List<Trade>>();
  let userPortfolios = Map.empty<Principal, Map.Map<Text, Float>>();
  let assetPrices = Map.empty<Text, AssetData>();

  // Stripe Integration
  var stripeConfiguration : ?Stripe.StripeConfiguration = null;
  let stripeSessionOwners = Map.empty<Text, Principal>();

  public query func isStripeConfigured() : async Bool {
    stripeConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    // Verify caller owns this session or is admin
    switch (stripeSessionOwners.get(sessionId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?owner) {
        if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own payment sessions");
        };
      };
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    let sessionId = await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
    stripeSessionOwners.add(sessionId, caller);
    sessionId;
  };

  public shared ({ caller }) func registerUser(
    name : Text,
    email : Text,
    mobile : Text,
    age : Nat,
    aadhaarMock : Text,
    panMock : Text
  ) : async () {
    if (userProfiles.containsKey(caller)) { Runtime.trap("User already registered") };

    let profile : UserProfile = {
      name;
      email;
      mobile;
      age;
      aadhaarMock;
      panMock;
      registrationTime = Time.now();
      kycStatus = #pending;
      isTaxFree = true;
      trialEndTime = ?(Time.now() + (17 * 24 * 60 * 60 * 1000000000));
    };

    userProfiles.add(caller, profile);
    userTrades.add(caller, List.empty<Trade>());
    userPortfolios.add(caller, Map.empty<Text, Float>());
  };

  public shared ({ caller }) func updateKYCStatus(user : Principal, status : KYCStatus) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update KYC status");
    };
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let updatedProfile : UserProfile = {
          name = profile.name;
          email = profile.email;
          mobile = profile.mobile;
          age = profile.age;
          aadhaarMock = profile.aadhaarMock;
          panMock = profile.panMock;
          registrationTime = profile.registrationTime;
          kycStatus = status;
          isTaxFree = profile.isTaxFree;
          trialEndTime = profile.trialEndTime;
        };
        userProfiles.add(user, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func placeTrade(
    asset : Text,
    assetType : AssetType,
    tradeType : { #buy; #sell },
    amount : Float
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place trades");
    };

    let now = Time.now();
    let profile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?p) {
        if (p.kycStatus == #banned) { Runtime.trap("User is banned") };
        p;
      };
    };

    let price = switch (assetPrices.get(asset)) {
      case (null) { Runtime.trap("Asset not found") };
      case (?data) { data.price };
    };

    let trade : Trade = {
      asset;
      assetType;
      tradeType;
      amount;
      price;
      timestamp = now;
    };

    let trades = switch (userTrades.get(caller)) {
      case (null) { List.empty<Trade>() };
      case (?t) { t };
    };
    let newTrades = List.empty<Trade>();
    for (t in trades.values()) { newTrades.add(t) };
    newTrades.add(trade);
    userTrades.add(caller, newTrades);

    let portfolio = switch (userPortfolios.get(caller)) {
      case (null) { Map.empty<Text, Float>() };
      case (?p) { p };
    };
    let currentHolding = switch (portfolio.get(asset)) {
      case (null) { 0.0 };
      case (?h) { h };
    };
    let newHolding = if (tradeType == #buy) { currentHolding + amount } else {
      currentHolding - amount;
    };
    portfolio.add(asset, newHolding);
    userPortfolios.add(caller, portfolio);

    if (shouldApplyTax(profile, trades.size())) {
      let taxAmount = amount * price * 0.001;
      let updatedProfile : UserProfile = {
        name = profile.name;
        email = profile.email;
        mobile = profile.mobile;
        age = profile.age;
        aadhaarMock = profile.aadhaarMock;
        panMock = profile.panMock;
        registrationTime = profile.registrationTime;
        kycStatus = profile.kycStatus;
        isTaxFree = false;
        trialEndTime = profile.trialEndTime;
      };
      userProfiles.add(caller, updatedProfile);
    };
  };

  func shouldApplyTax(profile : UserProfile, tradeCount : Nat) : Bool {
    if (tradeCount <= 7) { return false };
    switch (profile.trialEndTime) {
      case (null) { true };
      case (?endTime) { Time.now() > endTime };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllAssetPrices() : async [AssetData] {
    assetPrices.values().toArray();
  };

  public query ({ caller }) func getTradeHistory(user : Principal) : async [Trade] {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own trade history");
    };
    switch (userTrades.get(user)) {
      case (null) { [] };
      case (?trades) {
        trades.values().toArray().sort(Trade.compareByTimestamp);
      };
    };
  };

  public query ({ caller }) func getPortfolio(user : Principal) : async PortfolioView {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own portfolio");
    };
    switch (userPortfolios.get(user)) {
      case (null) {
        { holdings = []; totalValue = 0.0 };
      };
      case (?holdings) {
        var total = 0.0;
        holdings.values().forEach(func(amount) { total += amount });
        { holdings = holdings.toArray(); totalValue = total };
      };
    };
  };

  public query ({ caller }) func checkTrialStatus(user : Principal) : async Bool {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only check your own trial status");
    };
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        switch (profile.trialEndTime) {
          case (null) { false };
          case (?endTime) { Time.now() < endTime };
        };
      };
    };
  };

  public shared ({ caller }) func updateAssetPrice(name : Text, assetType : AssetType, price : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update asset prices");
    };
    let asset : AssetData = { name; assetType; price };
    assetPrices.add(name, asset);
  };
};
