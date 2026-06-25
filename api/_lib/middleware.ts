import { getSession, extractBearerToken } from "./auth";
import { unauthorized } from "./response";
import type { ApiHandler, ApiRequest, ApiResponse, Session } from "./types";

/**
 * Wrap a route handler with auth: validates the Bearer token against Redis and
 * attaches the session to `req.session`. Responds 401 if missing/invalid.
 */
export function requireAuth(handler: (req: AuthedRequest, res: ApiResponse) => void | Promise<void>): ApiHandler {
  return async (req, res) => {
    const token = extractBearerToken(req.headers ?? {});
    if (!token) return unauthorized(res, "Missing or invalid Authorization header");
    const session = await getSession(token);
    if (!session) return unauthorized(res, "Session expired or invalid");
    const authedReq = req as AuthedRequest;
    authedReq.session = session;
    authedReq.token = token;
    return handler(authedReq, res);
  };
}

export interface AuthedRequest extends ApiRequest {
  session: Session;
  token: string;
}
