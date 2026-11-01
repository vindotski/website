/** The caller, for rate limits: the first proxy hop if behind one (a CDN, a load balancer). */
export const clientIp = (request: Request) =>
	request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
	request.headers.get("x-real-ip") ||
	"unknown";
