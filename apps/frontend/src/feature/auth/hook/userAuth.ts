import { useDispatch } from "react-redux";
import { setError, setLoading, setUser } from "../state/auth.slice";
import { signin, signup } from "../service/auth.api";
export const useAuth = () => {
  const dispatch = useDispatch();

  async function handleSignin({ username, password }) {
    try {
      dispatch(setLoading(true));
      const data = await signin({ username, password });
      dispatch(setUser(data.user));
      return data.user;
    } catch (err) {
      dispatch(setError(err.response?.data?.message || "Signin failed"));
    } finally {
      dispatch(setLoading(false));
    }
  }

  async function handleSignup({ name, username, password }) {
    try {
      dispatch(setLoading(true));
      const data = await signup({ name, username, password });
      dispatch(setUser(data.user));
      return data.user;
    } catch (err) {
      dispatch(setError(err.response?.data?.message || "Signup failed"));
    } finally {
      dispatch(setLoading(false));
    }
  }

  return { handleSignin, handleSignup };
};
