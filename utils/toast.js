import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function successToast(text, delay) {
  toast.success(text, {
    position: "top-center",
    autoClose: delay,
    hideProgressBar: true,
    closeOnClick: false,
    pauseOnHover: false,
    pauseOnFocusLoss: false,
    draggable: false,
    progress: false,
    theme: "colored",
    icon: false,
    transition: Flip,
    closeButton: false,
  });
}

export function StyledToastContainer() {
  return <ToastContainer style={{ textAlign: "center" }} />;
}
