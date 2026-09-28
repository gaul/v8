// Copyright 2026 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Flags: --allow-natives-syntax --turbofan

// Polymorphic map checks are lowered to a chain of comparisons and branches,
// one per map. Cover a CheckMaps with several maps, a CompareMaps that feeds a
// branch and a CheckMaps that migrates instances of a deprecated map.

function A(x) { this.x = x; this.a = 1; }
function B(x) { this.x = x; this.b = 1; }
function C(x) { this.x = x; this.c = 1; }

(function TestCheckMaps() {
  // The field sits at the same index in all three maps, so the load is
  // guarded by a single CheckMaps with three maps.
  function load(o) { return o.x; }
  %PrepareFunctionForOptimization(load);
  assertEquals(1, load(new A(1)));
  assertEquals(2, load(new B(2)));
  assertEquals(3, load(new C(3)));
  %OptimizeFunctionOnNextCall(load);
  assertEquals(1, load(new A(1)));
  assertEquals(2, load(new B(2)));
  assertEquals(3, load(new C(3)));
  assertOptimized(load);
  assertEquals(4, load({x: 4, d: 1}));
  assertUnoptimized(load);
})();

(function TestCompareMaps() {
  // The field sits at different indices, so the maps are compared per group
  // and each group has its own load.
  function D(x) { this.d = 1; this.x = x; }
  function E(x) { this.e = 1; this.e2 = 2; this.x = x; }
  function load(o) { return o.x; }
  %PrepareFunctionForOptimization(load);
  assertEquals(1, load(new A(1)));
  assertEquals(2, load(new B(2)));
  assertEquals(3, load(new D(3)));
  assertEquals(4, load(new E(4)));
  %OptimizeFunctionOnNextCall(load);
  assertEquals(1, load(new A(1)));
  assertEquals(2, load(new B(2)));
  assertEquals(3, load(new D(3)));
  assertEquals(4, load(new E(4)));
  assertOptimized(load);
})();

(function TestMigration() {
  function F(x) { this.x = x; }
  const old1 = new F(1);
  const old2 = new F(1);
  const fresh = new F(1.5);  // Deprecates the map with a Smi field.
  old1.x;  // Migrates old1, which makes its new map a migration target.
  function load(o) { return o.x; }
  %PrepareFunctionForOptimization(load);
  assertEquals(1.5, load(fresh));
  assertEquals(1.5, load(fresh));
  %OptimizeFunctionOnNextCall(load);
  assertEquals(1.5, load(fresh));
  assertEquals(1, load(old2));
  assertOptimized(load);
})();
