export default {
  async fetch(request, env) {
    const SITE_ORIGIN = "https://apiszmod-site.lagasawahakun.workers.dev";
    const origin = request.headers.get("Origin");

    const headers = {
      "Access-Control-Allow-Origin": SITE_ORIGIN,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    };

    if (origin && origin !== SITE_ORIGIN) {
      return new Response("Origin tidak diizinkan", {
        status: 403,
        headers
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "GET") {
      return new Response("Method tidak diizinkan", {
        status: 405,
        headers
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "APISZMODSTORE DRIP proxy"
      }, { headers });
    }

    const allowed = [
      "/api/v1/me",
      "/api/v1/balance",
      "/api/v1/products",
      "/api/v1/pricing",
      "/api/v1/stock",
      "/api/v1/orders"
    ];

    if (!allowed.includes(url.pathname)) {
      return new Response("Endpoint tidak diizinkan", {
        status: 403,
        headers
      });
    }

    if (!env.DRIP_API_KEY) {
      return new Response("DRIP_API_KEY belum diatur", {
        status: 500,
        headers
      });
    }

    const target = new URL(
      "https://dripclientofficial.dev" + url.pathname + url.search
    );

    const response = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${env.DRIP_API_KEY}`,
        "Accept": "application/json"
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        ...headers,
        "Content-Type": response.headers.get("Content-Type") || "application/json"
      }
    });
  }
};
