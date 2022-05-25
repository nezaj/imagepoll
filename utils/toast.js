import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const options = {
  position: "top-center",
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  draggable: false,
  progress: false,
  theme: "colored",
  icon: false,
  transition: Flip,
  closeButton: false
}

export function successToast(text, delay) {
  toast.success(text, {...options, autoClose: delay});
}

export function errorToast(text, delay) {
  toast.error(text, {...options, autoClose: delay});
}


export function StyledToastContainer() {
  return <ToastContainer style={{ textAlign: "center" }} limit={4}/>;
}
