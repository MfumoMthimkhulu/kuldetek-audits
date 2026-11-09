import { Link } from "react-router-dom";

export default function AppLink({ href, ...props }) {
  return <Link to={href} {...props} />;
}
