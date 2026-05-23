import { useSession } from "../../context/SessionContext.jsx";
import AdminHome from "./AdminHome.jsx";
import WorkerHome from "./WorkerHome.jsx";

export default function HomeRouter(props) {
  const { isOwner } = useSession();
  return isOwner ? <AdminHome {...props} /> : <WorkerHome {...props} />;
}
