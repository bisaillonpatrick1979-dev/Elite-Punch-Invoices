import { useSession } from "../../context/SessionContext.jsx";
import AdminHome from "./AdminHome.jsx";
import WorkerHome from "./WorkerHome.jsx";

export default function HomeRouter() {
  const { isOwner } = useSession();
  return isOwner ? <AdminHome /> : <WorkerHome />;
}
