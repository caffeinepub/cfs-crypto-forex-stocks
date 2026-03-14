import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PortfolioView {
    totalValue: number;
    holdings: Array<[string, number]>;
}
export interface AssetData {
    name: string;
    assetType: AssetType;
    price: number;
}
export interface Trade {
    asset: string;
    tradeType: Variant_buy_sell;
    timestamp: bigint;
    assetType: AssetType;
    price: number;
    amount: number;
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
    getAllAssetPrices(): Promise<Array<AssetData>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPortfolio(user: Principal): Promise<PortfolioView>;
    getTradeHistory(user: Principal): Promise<Array<Trade>>;
    getUserProfile(user: Principal): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    placeTrade(asset: string, assetType: AssetType, tradeType: Variant_buy_sell, amount: number): Promise<void>;
    registerUser(name: string, email: string, mobile: string, age: bigint, aadhaarMock: string, panMock: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateAssetPrice(name: string, assetType: AssetType, price: number): Promise<void>;
    updateKYCStatus(user: Principal, status: KYCStatus): Promise<void>;
}
