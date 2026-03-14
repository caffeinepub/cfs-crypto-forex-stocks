import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssetType, UserProfile, Variant_buy_sell } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useCallerProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useTradeHistory() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["tradeHistory"],
    queryFn: async () => {
      if (!actor || !identity) return [];
      return actor.getTradeHistory(identity.getPrincipal());
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function usePortfolio() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      if (!actor || !identity)
        return { totalValue: 0, holdings: [] as Array<[string, number]> };
      return actor.getPortfolio(identity.getPrincipal());
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useRegisterUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      name: string;
      email: string;
      mobile: string;
      age: number;
      aadhaarMock: string;
      panMock: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await actor.registerUser(
        p.name,
        p.email,
        p.mobile,
        BigInt(p.age),
        p.aadhaarMock,
        p.panMock,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}

export function usePlaceTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      asset: string;
      assetType: AssetType;
      tradeType: Variant_buy_sell;
      amount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      await actor.placeTrade(p.asset, p.assetType, p.tradeType, p.amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tradeHistory"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}
