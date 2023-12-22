/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"Access-Control-Max-Age": "86400",
		};
  
		// The URL for the remote third party API you want to fetch from
		// but does not implement CORS
		const API_DEMO_URL = "anime/ranking?ranking_type=all&limit=4";
		const API_URL = "https://api.myanimelist.net/v2/";
  
		// The endpoint you want the CORS reverse proxy to be on
		const PROXY_ENDPOINT = "/corsproxy/";
  
		// The rest of this snippet for the demo page
		function rawHtmlResponse(html) {
			return new Response(html, {
				headers: {
					"content-type": "text/html;charset=UTF-8",
				},
			});
		}

		const DEMO_PAGE = `
		<!DOCTYPE html>
		<html>
			<body>
				<h1>API GET without CORS Proxy</h1>
				<a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful">Shows TypeError: Failed to fetch since CORS is misconfigured</a>
				<p id="noproxy-status"/>
				<code id="noproxy">Waiting</code>
				<h1>API GET with CORS Proxy</h1>
				<p id="proxy-status"/>
				<code id="proxy">Waiting</code>
				<script>
					let reqs = {};
					reqs.noproxy = () => {
						return fetch("${API_URL}${API_DEMO_URL}").then(r => r.json())
					}
					reqs.proxy = async () => {
						let href = "${PROXY_ENDPOINT}?apiurl=${API_DEMO_URL}"
						return fetch(window.location.origin + href).then(r => r.json())
					}
					(async () => {
						for (const [reqName, req] of Object.entries(reqs)) {
							try {
								let data = await req()
								document.getElementById(reqName).innerHTML = JSON.stringify(data)
							} catch (e) {
								document.getElementById(reqName).innerHTML = e
							}
						}
					})()
				</script>
			</body>
		</html>
		`;
  
	  	async function handleRequest(request) {
			const url = new URL(request.url);
			let apiUrl = url.searchParams.get("apiurl");

			apiUrl = API_URL + apiUrl;

			// Rewrite request to point to API URL. This also makes the request mutable
			// so you can add the correct Origin header to make the API server think
			// that this request is not cross-site.
			request = new Request(apiUrl, request);
			request.headers.set("X-MAL-CLIENT-ID", env.API_TOKEN);
			request.headers.set("Origin", new URL(apiUrl).origin);
			let response = await fetch(request);
			
			// Recreate the response so you can modify the headers
			response = new Response(response.body, response);

			// Set CORS headers
			response.headers.set("Access-Control-Allow-Origin", "*");

			// Append to/Add Vary header so browser will cache response correctly
			response.headers.append("Vary", "Origin");

			return response;
	  	}
  
	  	const url = new URL(request.url);
		if (url.pathname.startsWith(PROXY_ENDPOINT)) {
			if (request.method === "GET") {
				return handleRequest(request);
			} else {
				return new Response(null, {
					status: 405,
					statusText: "Method Not Allowed",
				});
			}
		} else {
			return rawHtmlResponse(DEMO_PAGE);
		}
	},
};
