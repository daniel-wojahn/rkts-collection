const jt = "5";
var vt;
typeof window < "u" && ((vt = window.__svelte ?? (window.__svelte = {})).v ?? (vt.v = /* @__PURE__ */ new Set())).add(jt);
const Zt = 1, Gt = 2, Jt = 16, Qt = 2, L = Symbol(), Qe = !1;
var He = Array.isArray, Xt = Array.prototype.indexOf, Ve = Array.from, er = Object.defineProperty, ve = Object.getOwnPropertyDescriptor, tr = Object.prototype, rr = Array.prototype, nr = Object.getPrototypeOf, Xe = Object.isExtensible;
function lr(e) {
  for (var t = 0; t < e.length; t++)
    e[t]();
}
const I = 2, ct = 4, Me = 8, Ue = 16, W = 32, le = 64, ge = 128, A = 256, ye = 512, M = 1024, B = 2048, ee = 4096, U = 8192, Ne = 16384, ir = 32768, We = 65536, ar = 1 << 19, _t = 1 << 20, qe = 1 << 21, he = Symbol("$state");
function dt(e) {
  return e === this.v;
}
function sr(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function ht(e) {
  return !sr(e, this.v);
}
function ur(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function fr() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function or(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function vr() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function cr() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function _r() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function dr() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
let hr = !1;
function pr(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
let z = null;
function et(e) {
  z = e;
}
function pt(e, t = !1, r) {
  var n = z = {
    p: z,
    c: null,
    d: !1,
    e: null,
    m: !1,
    s: e,
    x: null,
    l: null
  };
  Mt(() => {
    n.d = !0;
  });
}
function wt(e) {
  const t = z;
  if (t !== null) {
    const u = t.e;
    if (u !== null) {
      var r = y, n = p;
      t.e = null;
      try {
        for (var i = 0; i < u.length; i++) {
          var l = u[i];
          G(l.effect), H(l.reaction), Ke(l.fn);
        }
      } finally {
        G(r), H(n);
      }
    }
    z = t.p, t.m = !0;
  }
  return (
    /** @type {T} */
    {}
  );
}
function gt() {
  return !0;
}
function Q(e) {
  if (typeof e != "object" || e === null || he in e)
    return e;
  const t = nr(e);
  if (t !== tr && t !== rr)
    return e;
  var r = /* @__PURE__ */ new Map(), n = He(e), i = /* @__PURE__ */ O(0), l = p, u = (v) => {
    var a = p;
    H(l);
    var c = v();
    return H(a), c;
  };
  return n && r.set("length", /* @__PURE__ */ O(
    /** @type {any[]} */
    e.length
  )), new Proxy(
    /** @type {any} */
    e,
    {
      defineProperty(v, a, c) {
        (!("value" in c) || c.configurable === !1 || c.enumerable === !1 || c.writable === !1) && cr();
        var o = r.get(a);
        return o === void 0 ? (o = u(() => /* @__PURE__ */ O(c.value)), r.set(a, o)) : b(
          o,
          u(() => Q(c.value))
        ), !0;
      },
      deleteProperty(v, a) {
        var c = r.get(a);
        if (c === void 0)
          a in v && (r.set(
            a,
            u(() => /* @__PURE__ */ O(L))
          ), Ie(i));
        else {
          if (n && typeof a == "string") {
            var o = (
              /** @type {Source<number>} */
              r.get("length")
            ), f = Number(a);
            Number.isInteger(f) && f < o.v && b(o, f);
          }
          b(c, L), Ie(i);
        }
        return !0;
      },
      get(v, a, c) {
        var _;
        if (a === he)
          return e;
        var o = r.get(a), f = a in v;
        if (o === void 0 && (!f || (_ = ve(v, a)) != null && _.writable) && (o = u(() => /* @__PURE__ */ O(Q(f ? v[a] : L))), r.set(a, o)), o !== void 0) {
          var s = g(o);
          return s === L ? void 0 : s;
        }
        return Reflect.get(v, a, c);
      },
      getOwnPropertyDescriptor(v, a) {
        var c = Reflect.getOwnPropertyDescriptor(v, a);
        if (c && "value" in c) {
          var o = r.get(a);
          o && (c.value = g(o));
        } else if (c === void 0) {
          var f = r.get(a), s = f == null ? void 0 : f.v;
          if (f !== void 0 && s !== L)
            return {
              enumerable: !0,
              configurable: !0,
              value: s,
              writable: !0
            };
        }
        return c;
      },
      has(v, a) {
        var s;
        if (a === he)
          return !0;
        var c = r.get(a), o = c !== void 0 && c.v !== L || Reflect.has(v, a);
        if (c !== void 0 || y !== null && (!o || (s = ve(v, a)) != null && s.writable)) {
          c === void 0 && (c = u(() => /* @__PURE__ */ O(o ? Q(v[a]) : L)), r.set(a, c));
          var f = g(c);
          if (f === L)
            return !1;
        }
        return o;
      },
      set(v, a, c, o) {
        var x;
        var f = r.get(a), s = a in v;
        if (n && a === "length")
          for (var _ = c; _ < /** @type {Source<number>} */
          f.v; _ += 1) {
            var d = r.get(_ + "");
            d !== void 0 ? b(d, L) : _ in v && (d = u(() => /* @__PURE__ */ O(L)), r.set(_ + "", d));
          }
        f === void 0 ? (!s || (x = ve(v, a)) != null && x.writable) && (f = u(() => /* @__PURE__ */ O(void 0)), b(
          f,
          u(() => Q(c))
        ), r.set(a, f)) : (s = f.v !== L, b(
          f,
          u(() => Q(c))
        ));
        var E = Reflect.getOwnPropertyDescriptor(v, a);
        if (E != null && E.set && E.set.call(o, c), !s) {
          if (n && typeof a == "string") {
            var N = (
              /** @type {Source<number>} */
              r.get("length")
            ), w = Number(a);
            Number.isInteger(w) && w >= N.v && b(N, w + 1);
          }
          Ie(i);
        }
        return !0;
      },
      ownKeys(v) {
        g(i);
        var a = Reflect.ownKeys(v).filter((f) => {
          var s = r.get(f);
          return s === void 0 || s.v !== L;
        });
        for (var [c, o] of r)
          o.v !== L && !(c in v) && a.push(c);
        return a;
      },
      setPrototypeOf() {
        _r();
      }
    }
  );
}
function Ie(e, t = 1) {
  b(e, e.v + t);
}
// @__NO_SIDE_EFFECTS__
function yt(e) {
  var t = I | B, r = p !== null && (p.f & I) !== 0 ? (
    /** @type {Derived} */
    p
  ) : null;
  return y === null || r !== null && (r.f & A) !== 0 ? t |= A : y.f |= _t, {
    ctx: z,
    deps: null,
    effects: null,
    equals: dt,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      null
    ),
    wv: 0,
    parent: r ?? y
  };
}
// @__NO_SIDE_EFFECTS__
function wr(e) {
  const t = /* @__PURE__ */ yt(e);
  return t.equals = ht, t;
}
function Et(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var r = 0; r < t.length; r += 1)
      Z(
        /** @type {Effect} */
        t[r]
      );
  }
}
function gr(e) {
  for (var t = e.parent; t !== null; ) {
    if ((t.f & I) === 0)
      return (
        /** @type {Effect} */
        t
      );
    t = t.parent;
  }
  return null;
}
function mt(e) {
  var t, r = y;
  G(gr(e));
  try {
    Et(e), t = Bt(e);
  } finally {
    G(r);
  }
  return t;
}
function xt(e) {
  var t = mt(e);
  if (e.equals(t) || (e.v = t, e.wv = qt()), !ae) {
    var r = (j || (e.f & A) !== 0) && e.deps !== null ? ee : M;
    R(e, r);
  }
}
const ce = /* @__PURE__ */ new Map();
function Ee(e, t) {
  var r = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v: e,
    reactions: null,
    equals: dt,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function O(e, t) {
  const r = Ee(e);
  return Cr(r), r;
}
// @__NO_SIDE_EFFECTS__
function yr(e, t = !1) {
  const r = Ee(e);
  return t || (r.equals = ht), r;
}
function b(e, t, r = !1) {
  p !== null && !P && gt() && (p.f & (I | Ue)) !== 0 && !(T != null && T.includes(e)) && dr();
  let n = r ? Q(t) : t;
  return bt(e, n);
}
function bt(e, t) {
  if (!e.equals(t)) {
    var r = e.v;
    ae ? ce.set(e, t) : ce.set(e, r), e.v = t, (e.f & I) !== 0 && ((e.f & B) !== 0 && mt(
      /** @type {Derived} */
      e
    ), R(e, (e.f & A) === 0 ? M : ee)), e.wv = qt(), kt(e, B), y !== null && (y.f & M) !== 0 && (y.f & (W | le)) === 0 && (S === null ? Ar([e]) : S.push(e));
  }
  return t;
}
function kt(e, t) {
  var r = e.reactions;
  if (r !== null)
    for (var n = r.length, i = 0; i < n; i++) {
      var l = r[i], u = l.f;
      (u & B) === 0 && (R(l, t), (u & (M | A)) !== 0 && ((u & I) !== 0 ? kt(
        /** @type {Derived} */
        l,
        ee
      ) : Ae(
        /** @type {Effect} */
        l
      )));
    }
}
let Er = !1;
var tt, Tt, Lt, zt;
function mr() {
  if (tt === void 0) {
    tt = window, Tt = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    Lt = ve(t, "firstChild").get, zt = ve(t, "nextSibling").get, Xe(e) && (e.__click = void 0, e.__className = void 0, e.__attributes = null, e.__style = void 0, e.__e = void 0), Xe(r) && (r.__t = void 0);
  }
}
function xr(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function me(e) {
  return Lt.call(e);
}
// @__NO_SIDE_EFFECTS__
function $e(e) {
  return zt.call(e);
}
function q(e, t) {
  return /* @__PURE__ */ me(e);
}
function re(e, t = 1, r = !1) {
  let n = e;
  for (; t--; )
    n = /** @type {TemplateNode} */
    /* @__PURE__ */ $e(n);
  return n;
}
function br(e) {
  e.textContent = "";
}
function kr(e) {
  y === null && p === null && or(), p !== null && (p.f & A) !== 0 && y === null && fr(), ae && ur();
}
function Tr(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function ie(e, t, r, n = !0) {
  var i = y, l = {
    ctx: z,
    deps: null,
    nodes_start: null,
    nodes_end: null,
    f: e | B,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: i,
    prev: null,
    teardown: null,
    transitions: null,
    wv: 0
  };
  if (r)
    try {
      Ze(l), l.f |= ir;
    } catch (a) {
      throw Z(l), a;
    }
  else t !== null && Ae(l);
  var u = r && l.deps === null && l.first === null && l.nodes_start === null && l.teardown === null && (l.f & (_t | ge)) === 0;
  if (!u && n && (i !== null && Tr(l, i), p !== null && (p.f & I) !== 0)) {
    var v = (
      /** @type {Derived} */
      p
    );
    (v.effects ?? (v.effects = [])).push(l);
  }
  return l;
}
function Mt(e) {
  const t = ie(Me, null, !1);
  return R(t, M), t.teardown = e, t;
}
function Nt(e) {
  kr();
  var t = y !== null && (y.f & W) !== 0 && z !== null && !z.m;
  if (t) {
    var r = (
      /** @type {ComponentContext} */
      z
    );
    (r.e ?? (r.e = [])).push({
      fn: e,
      effect: y,
      reaction: p
    });
  } else {
    var n = Ke(e);
    return n;
  }
}
function Lr(e) {
  const t = ie(le, e, !0);
  return (r = {}) => new Promise((n) => {
    r.outro ? xe(t, () => {
      Z(t), n(void 0);
    }) : (Z(t), n(void 0));
  });
}
function Ke(e) {
  return ie(ct, e, !1);
}
function Ct(e) {
  return ie(Me, e, !0);
}
function rt(e, t = [], r = yt) {
  const n = t.map(r);
  return Ye(() => e(...n.map(g)));
}
function Ye(e, t = 0) {
  return ie(Me | Ue | t, e, !0);
}
function _e(e, t = !0) {
  return ie(Me | W, e, !0, t);
}
function At(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = ae, n = p;
    nt(!0), H(null);
    try {
      t.call(null);
    } finally {
      nt(r), H(n);
    }
  }
}
function St(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    var n = r.next;
    (r.f & le) !== 0 ? r.parent = null : Z(r, t), r = n;
  }
}
function zr(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & W) === 0 && Z(t), t = r;
  }
}
function Z(e, t = !0) {
  var r = !1;
  (t || (e.f & ar) !== 0) && e.nodes_start !== null && (Mr(
    e.nodes_start,
    /** @type {TemplateNode} */
    e.nodes_end
  ), r = !0), St(e, t && !r), ze(e, 0), R(e, Ne);
  var n = e.transitions;
  if (n !== null)
    for (const l of n)
      l.stop();
  At(e);
  var i = e.parent;
  i !== null && i.first !== null && Ot(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes_start = e.nodes_end = null;
}
function Mr(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : (
      /** @type {TemplateNode} */
      /* @__PURE__ */ $e(e)
    );
    e.remove(), e = r;
  }
}
function Ot(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function xe(e, t) {
  var r = [];
  je(e, r, !0), Dt(r, () => {
    Z(e), t && t();
  });
}
function Dt(e, t) {
  var r = e.length;
  if (r > 0) {
    var n = () => --r || t();
    for (var i of e)
      i.out(n);
  } else
    t();
}
function je(e, t, r) {
  if ((e.f & U) === 0) {
    if (e.f ^= U, e.transitions !== null)
      for (const u of e.transitions)
        (u.is_global || r) && t.push(u);
    for (var n = e.first; n !== null; ) {
      var i = n.next, l = (n.f & We) !== 0 || (n.f & W) !== 0;
      je(n, t, l ? r : !1), n = i;
    }
  }
}
function be(e) {
  It(e, !0);
}
function It(e, t) {
  if ((e.f & U) !== 0) {
    e.f ^= U, (e.f & M) === 0 && (e.f ^= M), de(e) && (R(e, B), Ae(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, i = (r.f & We) !== 0 || (r.f & W) !== 0;
      It(r, i ? t : !1), r = n;
    }
    if (e.transitions !== null)
      for (const l of e.transitions)
        (l.is_global || t) && l.in();
  }
}
let ke = [];
function Nr() {
  var e = ke;
  ke = [], lr(e);
}
function Rt(e) {
  ke.length === 0 && queueMicrotask(Nr), ke.push(e);
}
let pe = !1, Pe = !1, Te = null, X = !1, ae = !1;
function nt(e) {
  ae = e;
}
let we = [];
let p = null, P = !1;
function H(e) {
  p = e;
}
let y = null;
function G(e) {
  y = e;
}
let T = null;
function Cr(e) {
  p !== null && p.f & qe && (T === null ? T = [e] : T.push(e));
}
let k = null, C = 0, S = null;
function Ar(e) {
  S = e;
}
let Ft = 1, Le = 0, j = !1;
function qt() {
  return ++Ft;
}
function de(e) {
  var f;
  var t = e.f;
  if ((t & B) !== 0)
    return !0;
  if ((t & ee) !== 0) {
    var r = e.deps, n = (t & A) !== 0;
    if (r !== null) {
      var i, l, u = (t & ye) !== 0, v = n && y !== null && !j, a = r.length;
      if (u || v) {
        var c = (
          /** @type {Derived} */
          e
        ), o = c.parent;
        for (i = 0; i < a; i++)
          l = r[i], (u || !((f = l == null ? void 0 : l.reactions) != null && f.includes(c))) && (l.reactions ?? (l.reactions = [])).push(c);
        u && (c.f ^= ye), v && o !== null && (o.f & A) === 0 && (c.f ^= A);
      }
      for (i = 0; i < a; i++)
        if (l = r[i], de(
          /** @type {Derived} */
          l
        ) && xt(
          /** @type {Derived} */
          l
        ), l.wv > e.wv)
          return !0;
    }
    (!n || y !== null && !j) && R(e, M);
  }
  return !1;
}
function Sr(e, t) {
  for (var r = t; r !== null; ) {
    if ((r.f & ge) !== 0)
      try {
        r.fn(e);
        return;
      } catch {
        r.f ^= ge;
      }
    r = r.parent;
  }
  throw pe = !1, e;
}
function lt(e) {
  return (e.f & Ne) === 0 && (e.parent === null || (e.parent.f & ge) === 0);
}
function Ce(e, t, r, n) {
  if (pe) {
    if (r === null && (pe = !1), lt(t))
      throw e;
    return;
  }
  if (r !== null && (pe = !0), Sr(e, t), lt(t))
    throw e;
}
function Pt(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null)
    for (var i = 0; i < n.length; i++) {
      var l = n[i];
      T != null && T.includes(e) || ((l.f & I) !== 0 ? Pt(
        /** @type {Derived} */
        l,
        t,
        !1
      ) : t === l && (r ? R(l, B) : (l.f & M) !== 0 && R(l, ee), Ae(
        /** @type {Effect} */
        l
      )));
    }
}
function Bt(e) {
  var _;
  var t = k, r = C, n = S, i = p, l = j, u = T, v = z, a = P, c = e.f;
  k = /** @type {null | Value[]} */
  null, C = 0, S = null, j = (c & A) !== 0 && (P || !X || p === null), p = (c & (W | le)) === 0 ? e : null, T = null, et(e.ctx), P = !1, Le++, e.f |= qe;
  try {
    var o = (
      /** @type {Function} */
      (0, e.fn)()
    ), f = e.deps;
    if (k !== null) {
      var s;
      if (ze(e, C), f !== null && C > 0)
        for (f.length = C + k.length, s = 0; s < k.length; s++)
          f[C + s] = k[s];
      else
        e.deps = f = k;
      if (!j)
        for (s = C; s < f.length; s++)
          ((_ = f[s]).reactions ?? (_.reactions = [])).push(e);
    } else f !== null && C < f.length && (ze(e, C), f.length = C);
    if (gt() && S !== null && !P && f !== null && (e.f & (I | ee | B)) === 0)
      for (s = 0; s < /** @type {Source[]} */
      S.length; s++)
        Pt(
          S[s],
          /** @type {Effect} */
          e
        );
    return i !== null && i !== e && (Le++, S !== null && (n === null ? n = S : n.push(.../** @type {Source[]} */
    S))), o;
  } finally {
    k = t, C = r, S = n, p = i, j = l, T = u, et(v), P = a, e.f ^= qe;
  }
}
function Or(e, t) {
  let r = t.reactions;
  if (r !== null) {
    var n = Xt.call(r, e);
    if (n !== -1) {
      var i = r.length - 1;
      i === 0 ? r = t.reactions = null : (r[n] = r[i], r.pop());
    }
  }
  r === null && (t.f & I) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (k === null || !k.includes(t)) && (R(t, ee), (t.f & (A | ye)) === 0 && (t.f ^= ye), Et(
    /** @type {Derived} **/
    t
  ), ze(
    /** @type {Derived} **/
    t,
    0
  ));
}
function ze(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++)
      Or(e, r[n]);
}
function Ze(e) {
  var t = e.f;
  if ((t & Ne) === 0) {
    R(e, M);
    var r = y, n = z, i = X;
    y = e, X = !0;
    try {
      (t & Ue) !== 0 ? zr(e) : St(e), At(e);
      var l = Bt(e);
      e.teardown = typeof l == "function" ? l : null, e.wv = Ft;
      var u = e.deps, v;
      Qe && hr && e.f & B;
    } catch (a) {
      Ce(a, e, r, n || e.ctx);
    } finally {
      X = i, y = r;
    }
  }
}
function Dr() {
  try {
    vr();
  } catch (e) {
    if (Te !== null)
      Ce(e, Te, null);
    else
      throw e;
  }
}
function Ir() {
  var e = X;
  try {
    var t = 0;
    for (X = !0; we.length > 0; ) {
      t++ > 1e3 && Dr();
      var r = we, n = r.length;
      we = [];
      for (var i = 0; i < n; i++) {
        var l = Fr(r[i]);
        Rr(l);
      }
      ce.clear();
    }
  } finally {
    Pe = !1, X = e, Te = null;
  }
}
function Rr(e) {
  var t = e.length;
  if (t !== 0)
    for (var r = 0; r < t; r++) {
      var n = e[r];
      if ((n.f & (Ne | U)) === 0)
        try {
          de(n) && (Ze(n), n.deps === null && n.first === null && n.nodes_start === null && (n.teardown === null ? Ot(n) : n.fn = null));
        } catch (i) {
          Ce(i, n, null, n.ctx);
        }
    }
}
function Ae(e) {
  Pe || (Pe = !0, queueMicrotask(Ir));
  for (var t = Te = e; t.parent !== null; ) {
    t = t.parent;
    var r = t.f;
    if ((r & (le | W)) !== 0) {
      if ((r & M) === 0) return;
      t.f ^= M;
    }
  }
  we.push(t);
}
function Fr(e) {
  for (var t = [], r = e; r !== null; ) {
    var n = r.f, i = (n & (W | le)) !== 0, l = i && (n & M) !== 0;
    if (!l && (n & U) === 0) {
      if ((n & ct) !== 0)
        t.push(r);
      else if (i)
        r.f ^= M;
      else
        try {
          de(r) && Ze(r);
        } catch (a) {
          Ce(a, r, null, r.ctx);
        }
      var u = r.first;
      if (u !== null) {
        r = u;
        continue;
      }
    }
    var v = r.parent;
    for (r = r.next; r === null && v !== null; )
      r = v.next, v = v.parent;
  }
  return t;
}
function g(e) {
  var t = e.f, r = (t & I) !== 0;
  if (p !== null && !P) {
    if (!(T != null && T.includes(e))) {
      var n = p.deps;
      e.rv < Le && (e.rv = Le, k === null && n !== null && n[C] === e ? C++ : k === null ? k = [e] : (!j || !k.includes(e)) && k.push(e));
    }
  } else if (r && /** @type {Derived} */
  e.deps === null && /** @type {Derived} */
  e.effects === null) {
    var i = (
      /** @type {Derived} */
      e
    ), l = i.parent;
    l !== null && (l.f & A) === 0 && (i.f ^= A);
  }
  return r && (i = /** @type {Derived} */
  e, de(i) && xt(i)), ae && ce.has(e) ? ce.get(e) : e.v;
}
function Ge(e) {
  var t = P;
  try {
    return P = !0, e();
  } finally {
    P = t;
  }
}
const qr = -7169;
function R(e, t) {
  e.f = e.f & qr | t;
}
let it = !1;
function Pr() {
  it || (it = !0, document.addEventListener(
    "reset",
    (e) => {
      Promise.resolve().then(() => {
        var t;
        if (!e.defaultPrevented)
          for (
            const r of
            /**@type {HTMLFormElement} */
            e.target.elements
          )
            (t = r.__on_r) == null || t.call(r);
      });
    },
    // In the capture phase to guarantee we get noticed of it (no possiblity of stopPropagation)
    { capture: !0 }
  ));
}
function Ht(e) {
  var t = p, r = y;
  H(null), G(null);
  try {
    return e();
  } finally {
    H(t), G(r);
  }
}
function Br(e, t, r, n = r) {
  e.addEventListener(t, () => Ht(r));
  const i = e.__on_r;
  i ? e.__on_r = () => {
    i(), n(!0);
  } : e.__on_r = () => n(!0), Pr();
}
const Vt = /* @__PURE__ */ new Set(), Be = /* @__PURE__ */ new Set();
function Hr(e, t, r, n = {}) {
  function i(l) {
    if (n.capture || oe.call(t, l), !l.cancelBubble)
      return Ht(() => r == null ? void 0 : r.call(this, l));
  }
  return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? Rt(() => {
    t.addEventListener(e, i, n);
  }) : t.addEventListener(e, i, n), i;
}
function Vr(e, t, r, n, i) {
  var l = { capture: n, passive: i }, u = Hr(e, t, r, l);
  (t === document.body || // @ts-ignore
  t === window || // @ts-ignore
  t === document || // Firefox has quirky behavior, it can happen that we still get "canplay" events when the element is already removed
  t instanceof HTMLMediaElement) && Mt(() => {
    t.removeEventListener(e, u, l);
  });
}
function Ur(e) {
  for (var t = 0; t < e.length; t++)
    Vt.add(e[t]);
  for (var r of Be)
    r(e);
}
function oe(e) {
  var x;
  var t = this, r = (
    /** @type {Node} */
    t.ownerDocument
  ), n = e.type, i = ((x = e.composedPath) == null ? void 0 : x.call(e)) || [], l = (
    /** @type {null | Element} */
    i[0] || e.target
  ), u = 0, v = e.__root;
  if (v) {
    var a = i.indexOf(v);
    if (a !== -1 && (t === document || t === /** @type {any} */
    window)) {
      e.__root = t;
      return;
    }
    var c = i.indexOf(t);
    if (c === -1)
      return;
    a <= c && (u = a);
  }
  if (l = /** @type {Element} */
  i[u] || e.target, l !== t) {
    er(e, "currentTarget", {
      configurable: !0,
      get() {
        return l || r;
      }
    });
    var o = p, f = y;
    H(null), G(null);
    try {
      for (var s, _ = []; l !== null; ) {
        var d = l.assignedSlot || l.parentNode || /** @type {any} */
        l.host || null;
        try {
          var E = l["__" + n];
          if (E != null && (!/** @type {any} */
          l.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          e.target === l))
            if (He(E)) {
              var [N, ...w] = E;
              N.apply(l, [e, ...w]);
            } else
              E.call(l, e);
        } catch ($) {
          s ? _.push($) : s = $;
        }
        if (e.cancelBubble || d === t || d === null)
          break;
        l = d;
      }
      if (s) {
        for (let $ of _)
          queueMicrotask(() => {
            throw $;
          });
        throw s;
      }
    } finally {
      e.__root = t, delete e.currentTarget, H(o), G(f);
    }
  }
}
function Ut(e) {
  var t = document.createElement("template");
  return t.innerHTML = e.replaceAll("<!>", "<!---->"), t.content;
}
function Wt(e, t) {
  var r = (
    /** @type {Effect} */
    y
  );
  r.nodes_start === null && (r.nodes_start = e, r.nodes_end = t);
}
// @__NO_SIDE_EFFECTS__
function Je(e, t) {
  var r = (t & Qt) !== 0, n, i = !e.startsWith("<!>");
  return () => {
    n === void 0 && (n = Ut(i ? e : "<!>" + e), n = /** @type {Node} */
    /* @__PURE__ */ me(n));
    var l = (
      /** @type {TemplateNode} */
      r || Tt ? document.importNode(n, !0) : n.cloneNode(!0)
    );
    return Wt(l, l), l;
  };
}
// @__NO_SIDE_EFFECTS__
function Wr(e, t, r = "svg") {
  var n = !e.startsWith("<!>"), i = `<${r}>${n ? e : "<!>" + e}</${r}>`, l;
  return () => {
    if (!l) {
      var u = (
        /** @type {DocumentFragment} */
        Ut(i)
      ), v = (
        /** @type {Element} */
        /* @__PURE__ */ me(u)
      );
      l = /** @type {Element} */
      /* @__PURE__ */ me(v);
    }
    var a = (
      /** @type {TemplateNode} */
      l.cloneNode(!0)
    );
    return Wt(a, a), a;
  };
}
// @__NO_SIDE_EFFECTS__
function $t(e, t) {
  return /* @__PURE__ */ Wr(e, t, "svg");
}
function fe(e, t) {
  e !== null && e.before(
    /** @type {Node} */
    t
  );
}
const $r = ["touchstart", "touchmove"];
function Kr(e) {
  return $r.includes(e);
}
function at(e, t) {
  var r = t == null ? "" : typeof t == "object" ? t + "" : t;
  r !== (e.__t ?? (e.__t = e.nodeValue)) && (e.__t = r, e.nodeValue = r + "");
}
function cn(e, t) {
  return Yr(e, t);
}
const ne = /* @__PURE__ */ new Map();
function Yr(e, { target: t, anchor: r, props: n = {}, events: i, context: l, intro: u = !0 }) {
  mr();
  var v = /* @__PURE__ */ new Set(), a = (f) => {
    for (var s = 0; s < f.length; s++) {
      var _ = f[s];
      if (!v.has(_)) {
        v.add(_);
        var d = Kr(_);
        t.addEventListener(_, oe, { passive: d });
        var E = ne.get(_);
        E === void 0 ? (document.addEventListener(_, oe, { passive: d }), ne.set(_, 1)) : ne.set(_, E + 1);
      }
    }
  };
  a(Ve(Vt)), Be.add(a);
  var c = void 0, o = Lr(() => {
    var f = r ?? t.appendChild(xr());
    return _e(() => {
      if (l) {
        pt({});
        var s = (
          /** @type {ComponentContext} */
          z
        );
        s.c = l;
      }
      i && (n.$$events = i), c = e(f, n) || {}, l && wt();
    }), () => {
      var d;
      for (var s of v) {
        t.removeEventListener(s, oe);
        var _ = (
          /** @type {number} */
          ne.get(s)
        );
        --_ === 0 ? (document.removeEventListener(s, oe), ne.delete(s)) : ne.set(s, _);
      }
      Be.delete(a), f !== r && ((d = f.parentNode) == null || d.removeChild(f));
    };
  });
  return jr.set(c, o), c;
}
let jr = /* @__PURE__ */ new WeakMap();
function Zr(e) {
  z === null && pr(), Nt(() => {
    const t = Ge(e);
    if (typeof t == "function") return (
      /** @type {() => void} */
      t
    );
  });
}
function st(e, t, [r, n] = [0, 0]) {
  var i = e, l = null, u = null, v = L, a = r > 0 ? We : 0, c = !1;
  const o = (s, _ = !0) => {
    c = !0, f(_, s);
  }, f = (s, _) => {
    v !== (v = s) && (v ? (l ? be(l) : _ && (l = _e(() => _(i))), u && xe(u, () => {
      u = null;
    })) : (u ? be(u) : _ && (u = _e(() => _(i, [r + 1, n]))), l && xe(l, () => {
      l = null;
    })));
  };
  Ye(() => {
    c = !1, t(o), c || f(null, null);
  }, a);
}
function Gr(e, t) {
  return t;
}
function Jr(e, t, r, n) {
  for (var i = [], l = t.length, u = 0; u < l; u++)
    je(t[u].e, i, !0);
  var v = l > 0 && i.length === 0 && r !== null;
  if (v) {
    var a = (
      /** @type {Element} */
      /** @type {Element} */
      r.parentNode
    );
    br(a), a.append(
      /** @type {Element} */
      r
    ), n.clear(), Y(e, t[0].prev, t[l - 1].next);
  }
  Dt(i, () => {
    for (var c = 0; c < l; c++) {
      var o = t[c];
      v || (n.delete(o.k), Y(e, o.prev, o.next)), Z(o.e, !v);
    }
  });
}
function Qr(e, t, r, n, i, l = null) {
  var u = e, v = { flags: t, items: /* @__PURE__ */ new Map(), first: null }, a = null, c = !1, o = /* @__PURE__ */ wr(() => {
    var f = r();
    return He(f) ? f : f == null ? [] : Ve(f);
  });
  Ye(() => {
    var f = g(o), s = f.length;
    c && s === 0 || (c = s === 0, Xr(f, v, u, i, t, n, r), l !== null && (s === 0 ? a ? be(a) : a = _e(() => l(u)) : a !== null && xe(a, () => {
      a = null;
    })), g(o));
  });
}
function Xr(e, t, r, n, i, l, u) {
  var v = e.length, a = t.items, c = t.first, o = c, f, s = null, _ = [], d = [], E, N, w, x;
  for (x = 0; x < v; x += 1) {
    if (E = e[x], N = l(E, x), w = a.get(N), w === void 0) {
      var $ = o ? (
        /** @type {TemplateNode} */
        o.e.nodes_start
      ) : r;
      s = tn(
        $,
        t,
        s,
        s === null ? t.first : s.next,
        E,
        N,
        x,
        n,
        i,
        u
      ), a.set(N, s), _ = [], d = [], o = s.next;
      continue;
    }
    if (en(w, E, x), (w.e.f & U) !== 0 && be(w.e), w !== o) {
      if (f !== void 0 && f.has(w)) {
        if (_.length < d.length) {
          var J = d[0], F;
          s = J.prev;
          var K = _[0], se = _[_.length - 1];
          for (F = 0; F < _.length; F += 1)
            ut(_[F], J, r);
          for (F = 0; F < d.length; F += 1)
            f.delete(d[F]);
          Y(t, K.prev, se.next), Y(t, s, K), Y(t, se, J), o = J, s = se, x -= 1, _ = [], d = [];
        } else
          f.delete(w), ut(w, o, r), Y(t, w.prev, w.next), Y(t, w, s === null ? t.first : s.next), Y(t, s, w), s = w;
        continue;
      }
      for (_ = [], d = []; o !== null && o.k !== N; )
        (o.e.f & U) === 0 && (f ?? (f = /* @__PURE__ */ new Set())).add(o), d.push(o), o = o.next;
      if (o === null)
        continue;
      w = o;
    }
    _.push(w), s = w, o = w.next;
  }
  if (o !== null || f !== void 0) {
    for (var h = f === void 0 ? [] : Ve(f); o !== null; )
      (o.e.f & U) === 0 && h.push(o), o = o.next;
    var m = h.length;
    if (m > 0) {
      var D = null;
      Jr(t, h, D, a);
    }
  }
  y.first = t.first && t.first.e, y.last = s && s.e;
}
function en(e, t, r, n) {
  bt(e.v, t), e.i = r;
}
function tn(e, t, r, n, i, l, u, v, a, c) {
  var o = (a & Zt) !== 0, f = (a & Jt) === 0, s = o ? f ? /* @__PURE__ */ yr(i) : Ee(i) : i, _ = (a & Gt) === 0 ? u : Ee(u), d = {
    i: _,
    v: s,
    k: l,
    a: null,
    // @ts-expect-error
    e: null,
    prev: r,
    next: n
  };
  try {
    return d.e = _e(() => v(e, s, _, c), Er), d.e.prev = r && r.e, d.e.next = n && n.e, r === null ? t.first = d : (r.next = d, r.e.next = d.e), n !== null && (n.prev = d, n.e.prev = d.e), d;
  } finally {
  }
}
function ut(e, t, r) {
  for (var n = e.next ? (
    /** @type {TemplateNode} */
    e.next.e.nodes_start
  ) : r, i = t ? (
    /** @type {TemplateNode} */
    t.e.nodes_start
  ) : r, l = (
    /** @type {TemplateNode} */
    e.e.nodes_start
  ); l !== n; ) {
    var u = (
      /** @type {TemplateNode} */
      /* @__PURE__ */ $e(l)
    );
    i.before(l), l = u;
  }
}
function Y(e, t, r) {
  t === null ? e.first = r : (t.next = r, t.e.next = r && r.e), r !== null && (r.prev = t, r.e.prev = t && t.e);
}
function rn(e, t, r) {
  var n = e == null ? "" : "" + e;
  return n = n ? n + " " + t : t, n === "" ? null : n;
}
function ft(e, t, r, n, i, l) {
  var u = e.__className;
  if (u !== r || u === void 0) {
    var v = rn(r, n);
    v == null ? e.removeAttribute("class") : e.className = v, e.__className = r;
  }
  return l;
}
function nn(e, t, r = t) {
  Br(e, "input", (n) => {
    var i = n ? e.defaultValue : e.value;
    if (i = Re(e) ? Fe(i) : i, r(i), i !== (i = t())) {
      var l = e.selectionStart, u = e.selectionEnd;
      e.value = i ?? "", u !== null && (e.selectionStart = l, e.selectionEnd = Math.min(u, e.value.length));
    }
  }), // If we are hydrating and the value has since changed,
  // then use the updated value from the input instead.
  // If defaultValue is set, then value == defaultValue
  // TODO Svelte 6: remove input.value check and set to empty string?
  Ge(t) == null && e.value && r(Re(e) ? Fe(e.value) : e.value), Ct(() => {
    var n = t();
    Re(e) && n === Fe(e.value) || e.type === "date" && !n && !e.value || n !== e.value && (e.value = n ?? "");
  });
}
function Re(e) {
  var t = e.type;
  return t === "number" || t === "range";
}
function Fe(e) {
  return e === "" ? null : +e;
}
function ot(e, t) {
  return e === t || (e == null ? void 0 : e[he]) === t;
}
function ln(e = {}, t, r, n) {
  return Ke(() => {
    var i, l;
    return Ct(() => {
      i = l, l = [], Ge(() => {
        e !== r(...l) && (t(e, ...l), i && ot(r(...i), e) && t(null, ...i));
      });
    }), () => {
      Rt(() => {
        l && ot(r(...l), e) && t(null, ...l);
      });
    };
  }), e;
}
function an(e, t) {
  e.key === "Enter" && !e.shiftKey && (e.preventDefault(), t());
}
var sn = /* @__PURE__ */ $t('<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="svelte-wyrn7z"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" class="svelte-wyrn7z"></path><circle cx="12" cy="7" r="4" class="svelte-wyrn7z"></circle></svg>'), un = /* @__PURE__ */ $t('<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-wyrn7z"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-wyrn7z"></path><path d="M2 17L12 22L22 17" class="svelte-wyrn7z"></path><path d="M2 12L12 17L22 12" class="svelte-wyrn7z"></path></svg>'), fn = /* @__PURE__ */ Je('<div><div><!></div> <div class="message svelte-wyrn7z"> </div></div>'), on = /* @__PURE__ */ Je('<div class="message-wrapper assistant svelte-wyrn7z"><div class="avatar assistant svelte-wyrn7z"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-wyrn7z"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-wyrn7z"></path><path d="M2 17L12 22L22 17" class="svelte-wyrn7z"></path><path d="M2 12L12 17L22 12" class="svelte-wyrn7z"></path></svg></div> <div class="loading-dots svelte-wyrn7z"><div class="loading-dot svelte-wyrn7z"></div> <div class="loading-dot svelte-wyrn7z"></div> <div class="loading-dot svelte-wyrn7z"></div></div></div>'), vn = /* @__PURE__ */ Je('<div class="wrapper svelte-wyrn7z"><div class="header svelte-wyrn7z"><div class="header-icon svelte-wyrn7z"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="svelte-wyrn7z"><path d="M12 2L2 7L12 12L22 7L12 2Z" class="svelte-wyrn7z"></path><path d="M2 17L12 22L22 17" class="svelte-wyrn7z"></path><path d="M2 12L12 17L22 12" class="svelte-wyrn7z"></path></svg></div> <div class="header-title svelte-wyrn7z"> </div></div> <div class="messages svelte-wyrn7z"><!> <!></div> <div class="input-container svelte-wyrn7z"><form class="svelte-wyrn7z"><div class="input-wrapper svelte-wyrn7z"><textarea placeholder="Send a message..." class="svelte-wyrn7z"></textarea> <button type="submit" aria-label="Send message" class="svelte-wyrn7z"><svg class="send-icon svelte-wyrn7z" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" class="svelte-wyrn7z"></path></svg></button></div></form></div></div>');
function _n(e, t) {
  pt(t, !0);
  let r = /* @__PURE__ */ O(Q([])), n = /* @__PURE__ */ O(""), i = /* @__PURE__ */ O(!1), l, u = "", v = /* @__PURE__ */ O("gpt-4o-mini"), a = "/api/chat/completions";
  Zr(() => {
    console.log("ChatWidget onMount triggered. Attempting to read query parameters.");
    try {
      const h = new URLSearchParams(window.location.search), m = h.get("api_key"), D = h.get("model"), V = h.get("endpoint");
      m !== null && (u = m), D !== null && b(v, D, !0), V !== null && (a = V), console.log("Query parameters processed:", { apiKey: u, model: g(v), endpoint: a });
    } catch (h) {
      console.error("Error processing query parameters in onMount:", h);
    }
  }), Nt(() => {
    g(r).length && l && setTimeout(
      () => {
        l.scrollTop = l.scrollHeight;
      },
      100
    );
  });
  async function c() {
    var m, D, V;
    const h = g(n).trim();
    if (!(!h || g(i))) {
      b(
        r,
        [
          ...g(r),
          { role: "user", content: h }
        ],
        !0
      ), b(n, ""), b(i, !0);
      try {
        const ue = await (await fetch(a, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${u}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: g(v),
            messages: [{ role: "user", content: h }]
          })
        })).json(), Oe = ((V = (D = (m = ue == null ? void 0 : ue.choices) == null ? void 0 : m[0]) == null ? void 0 : D.message) == null ? void 0 : V.content) ?? "⚠️ Error retrieving response";
        b(
          r,
          [
            ...g(r),
            { role: "assistant", content: Oe }
          ],
          !0
        );
      } catch {
        b(
          r,
          [
            ...g(r),
            {
              role: "assistant",
              content: "⚠️ Network error"
            }
          ],
          !0
        );
      } finally {
        b(i, !1);
      }
    }
  }
  function o(h) {
    const m = h.target;
    m.style.height = "auto", m.style.height = Math.min(m.scrollHeight, 120) + "px";
  }
  var f = vn(), s = q(f), _ = re(q(s), 2), d = q(_), E = re(s, 2), N = q(E);
  Qr(N, 17, () => g(r), Gr, (h, m) => {
    var D = fn(), V = q(D), Se = q(V);
    {
      var ue = (te) => {
        var De = sn();
        fe(te, De);
      }, Oe = (te) => {
        var De = un();
        fe(te, De);
      };
      st(Se, (te) => {
        g(m).role === "user" ? te(ue) : te(Oe, !1);
      });
    }
    var Kt = re(V, 2), Yt = q(Kt);
    rt(() => {
      ft(D, 1, `message-wrapper ${g(m).role ?? ""}`, "svelte-wyrn7z"), ft(V, 1, `avatar ${g(m).role ?? ""}`, "svelte-wyrn7z"), at(Yt, g(m).content);
    }), fe(h, D);
  });
  var w = re(N, 2);
  {
    var x = (h) => {
      var m = on();
      fe(h, m);
    };
    st(w, (h) => {
      g(i) && h(x);
    });
  }
  ln(E, (h) => l = h, () => l);
  var $ = re(E, 2), J = q($), F = q(J), K = q(F);
  K.__keydown = [an, c], K.__input = o;
  var se = re(K, 2);
  rt(
    (h) => {
      at(d, g(v)), K.disabled = g(i), se.disabled = h;
    },
    [
      () => !g(n).trim() || g(i)
    ]
  ), Vr("submit", J, (h) => {
    h.preventDefault(), c();
  }), nn(K, () => g(n), (h) => b(n, h)), fe(e, f), wt();
}
Ur(["keydown", "input"]);
export {
  _n as ChatWidget,
  _n as default,
  cn as mount
};
