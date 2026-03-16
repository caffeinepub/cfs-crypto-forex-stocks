import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Trade {
    asset: string;
    tradeType: Variant_buy_sell;
    timestamp: bigint;
    assetType: AssetType;
    price: number;
    amount: number;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface PortfolioView {
    totalValue: number;
    holdings: Array<[string, number]>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface AssetData {
    name: string;
    assetType: AssetType;
    price: number;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface UserProfile {
    age: bigint;
    trialEndTime?: bigint;
    name: string;
    email: string;
    kycStatus: KYCStatus;
    panMock: string;
    aadhaarMock: string;
    mobile: string;
    registrationTime: bigint;
    isTaxFree: boolean;
}
export enum AssetType {
    forex = "forex",
    stock = "stock",
    crypto = "crypto"
}
export enum KYCStatus {
    verified = "verified",
    pending = "pending",
    banned = "banned",
    unverified = "unverified"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_buy_sell {
    buy = "buy",
    sell = "sell"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkTrialStatus(user: Principal): Promise<boolean>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    getAllAssetPrices(): Promise<Array<AssetData>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPortfolio(user: Principal): Promise<PortfolioView>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTradeHistory(user: Principal): Promise<Array<Trade>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    placeTrade(asset: string, assetType: AssetType, tradeType: Variant_buy_sell, amount: number): Promise<void>;
    registerUser(name: string, email: string, mobile: string, age: bigint, aadhaarMock: string, panMock: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateAssetPrice(name: string, assetType: AssetType, price: number): Promise<void>;
    updateKYCStatus(user: Principal, status: KYCStatus): Promise<void>;
}
