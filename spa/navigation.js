import { useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams as useRouterSearchParams } from "react-router-dom";

export { useParams };

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  return useRouterSearchParams()[0];
}

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => ({
    push: href => navigate(href),
    replace: href => navigate(href, { replace: true }),
    back: () => navigate(-1),
    prefetch: () => {},
  }), [navigate]);
}
