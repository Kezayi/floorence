import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { checkGestureOrder, checkTributeGestures, readQuota, validateGesturePrice, validateGestureQuota } from "./gestureRules.ts";

Deno.test("price 650 XAF accepted", () => assertEquals(validateGesturePrice({ amount: 650, currency: "XAF" }).ok, true));
Deno.test("price 0 refused", () => assertEquals(validateGesturePrice({ amount: 0, currency: "XAF" }).ok, false));
Deno.test("negative price refused", () => assertEquals(validateGesturePrice({ amount: -650 }).ok, false));
Deno.test("non-XAF refused", () => assertEquals(validateGesturePrice({ amount: 650, currency: "XOF" }).ok, false));
Deno.test("missing quota setting means 1", () => assertEquals(readQuota(null), 1));
Deno.test("quota 3 accepted", () => assertEquals(readQuota({ max: 3 }), 3));
Deno.test("quota 0 refused", () => assertEquals(validateGestureQuota({ max: 0 }).ok, false));
Deno.test("quota 11 refused", () => assertEquals(validateGestureQuota({ max: 11 }).ok, false));
Deno.test("initial quota: 1 candle ok", () => assertEquals(checkTributeGestures(1, 0, 1).ok, true));
Deno.test("initial quota: 2 candles refused", () => assertEquals(checkTributeGestures(2, 0, 1).ok, false));
Deno.test("candle and flower together refused", () => assertEquals(checkTributeGestures(1, 1, 5).ok, false));
Deno.test("written tribute without gesture ok", () => assertEquals(checkTributeGestures(0, 0, 1).ok, true));
Deno.test("second order beyond quota refused", () => assertEquals(checkGestureOrder(1, 0, 1, 1).ok, false));
Deno.test("repeat while pending refused", () => assertEquals(checkGestureOrder(0, 1, 1, 1).ok, false));
Deno.test("raised quota 3 allows second", () => assertEquals(checkGestureOrder(1, 0, 1, 3).ok, true));
Deno.test("later order on existing tribute bounded per order", () => assertEquals(checkGestureOrder(0, 0, 1, 1).ok, true));
