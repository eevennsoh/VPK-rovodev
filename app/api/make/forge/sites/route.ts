import { proxyToBackend } from "@/app/api/make/_utils/proxy";

export async function GET() {
	return proxyToBackend({
		method: "GET",
		path: "/api/make/forge/sites",
	});
}
