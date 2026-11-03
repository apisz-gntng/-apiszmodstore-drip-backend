const DRIP_BASE_URL = "https://dripclientofficial.dev";
const SITE_ORIGIN = "https://apiszmod-site.lagasawahakun.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    const corsHeaders = {
      "Access-Control-Allow-Origin": SITE_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });

    if (origin && origin !== SITE_ORIGIN) {
      return json({ ok: false, error: "Origin tidak diizinkan" }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        service: "APISZMODSTORE DRIP proxy"
      });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ ok: false, error: "Method tidak diizinkan" }, 405);
    }

    // Hanya endpoint DRIP yang diizinkan.
    const path = url.pathname;

    const allowed =
      path === "/api/v1/me" ||
      path === "/api/v1/balance" ||
      path === "/api/v1/products" ||
      /^\/api\/v1\/products\/[^/]+$/.test(path) ||
      path === "/api/v1/pricing" ||
      path === "/api/v1/stock" ||
      path === "/api/v1/orders" ||
      (request.method === "GET" &&
        /^\/api\/v1\/orders\/[^/]+$/.test(path));

    if (!allowed) {
      return json({ ok: false, error: "Endpoint tidak diizinkan" }, 404);
    }

    // Pembuatan pesanan hanya melalui POST.
    if (request.method === "POST" && path !== "/api/v1/orders") {
      return json({ ok: false, error: "POST tidak diizinkan untuk endpoint ini" }, 405);
    }

    if (!env.DRIP_API_KEY) {
      return json({
        ok: false,
        error: "Secret DRIP_API_KEY belum tersedia pada deployment ini"
      }, 500);
    }

    let body;

    if (request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";

      if (!contentType.toLowerCase().includes("application/json")) {
        return json({
          ok: false,
          error: "Content-Type harus application/json"
        }, 415);
      }

      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "JSON request tidak valid" }, 400);
      }
    }

    const target = new URL(DRIP_BASE_URL);
    target.pathname = path;
    target.search = url.search;

    try {
      const upstreamHeaders = {
        "Authorization": `Bearer ${env.DRIP_API_KEY}`,
        "Accept": "application/json"
      };

      if (request.method === "POST") {
        upstreamHeaders["Content-Type"] = "application/json";
      }

      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        ...(request.method === "POST"
          ? { body: JSON.stringify(body) }
          : {})
      });

      const responseBody = await upstream.text();

      return new Response(responseBody, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type":
            upstream.headers.get("Content-Type") || "application/json"
        }
      });
    } catch {
      return json({
        ok: false,
        error: "Tidak dapat terhubung ke server DRIP"
      }, 502);
    }
  }
};
