
const DRIP_BASE_URL = "https://dripclientofficial.dev";
const SITE_ORIGIN = "https://apiszmod-site.lagasawahakun.workers.dev";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    const allowedOrigins = [SITE_ORIGIN];
    const originAllowed = !origin || allowedOrigins.includes(origin);

    const corsHeaders = {
      "Access-Control-Allow-Origin": originAllowed && origin
        ? origin
        : SITE_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });

    if (!originAllowed) {
      return json({ ok: false, error: "Origin tidak diizinkan" }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "APISZMODSTORE DRIP proxy" });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ ok: false, error: "Method tidak diizinkan" }, 405);
    }

    const path = url.pathname;
    const allowed =
      path === "/api/v1/me" ||
      path === "/api/v1/balance" ||
      path === "/api/v1/products" ||
      /^\/api\/v1\/products\/[^/]+$/.test(path) ||
      path === "/api/v1/pricing" ||
      path === "/api/v1/stock" ||
      path === "/api/v1/orders" ||
      (request.method === "GET" && /^\/api\/v1\/orders\/[^/]+$/.test(path));

    if (!allowed) {
      return json({ ok: false, error: "Endpoint tidak diizinkan" }, 404);
    }

    if (request.method === "POST" && path !== "/api/v1/orders") {
      return json({ ok: false, error: "POST tidak diizinkan untuk endpoint ini" }, 405);
    }

    const apiKey = env?.API_KEY_DRIP;

    if (!apiKey) {
      return json({
        ok: false,
        error: "Secret API_KEY_DRIP tidak tersedia"
      }, 500);
    }

    let body;

    if (request.method === "POST") {
      const contentType = request.headers.get("Content-Type") || "";

      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ ok: false, error: "Content-Type harus application/json" }, 415);
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
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      };

      if (request.method === "POST") {
        headers["Content-Type"] = "application/json";
      }

      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        ...(request.method === "POST" ? { body: JSON.stringify(body) } : {})
      });

      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("Content-Type") || "application/json"
        }
      });
    } catch {
      return json({ ok: false, error: "Tidak dapat terhubung ke server DRIP" }, 502);
    }
  }
};
