import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { checkGestureOrder, checkTributeGestures, validateGesturePrice } from "./gestureRules.ts";

Deno.test("prix 700 accepté", () => assertEquals(validateGesturePrice({ amount: 700, currency: "XAF" }).ok, true));
Deno.test("prix 499 refusé", () => assertEquals(validateGesturePrice({ amount: 499, currency: "XAF" }).ok, false));
Deno.test("prix 0 refusé", () => assertEquals(validateGesturePrice({ amount: 0 }).ok, false));
Deno.test("devise non XAF refusée", () => assertEquals(validateGesturePrice({ amount: 700, currency: "XOF" }).ok, false));
Deno.test("100 cierges acceptés", () => assertEquals(checkTributeGestures(100, 0).ok, true));
Deno.test("200 fleurs acceptées", () => assertEquals(checkTributeGestures(0, 200).ok, true));
Deno.test("hommage sans geste accepté", () => assertEquals(checkTributeGestures(0, 0).ok, true));
Deno.test("quantité négative refusée", () => assertEquals(checkTributeGestures(-1, 0).ok, false));
Deno.test("commande de 200 × 700 acceptée", () => assertEquals(checkGestureOrder(200, 700).ok, true));
Deno.test("commande de 1428 × 700 acceptée (999 600 XAF)", () => assertEquals(checkGestureOrder(1428, 700).ok, true));
Deno.test("commande au-delà du plafond opérateur refusée", () => assertEquals(checkGestureOrder(1429, 700).ok, false));
Deno.test("quantité 0 refusée", () => assertEquals(checkGestureOrder(0, 700).ok, false));
Deno.test("quantité décimale refusée", () => assertEquals(checkGestureOrder(1.5, 700).ok, false));
