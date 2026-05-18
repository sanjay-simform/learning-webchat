import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Button";
import { ProfileCard } from "../components/ProfileCard";
import { motion } from "motion/react";
import { clearAuthSession } from "../utils/auth-session";

export const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate("/signin");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24 }}
      className="min-h-screen bg-base flex flex-col items-center justify-center px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="text-center max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1 }}
        >
          <h1 className="text-5xl font-bold text-primary mb-4">
            Welcome Back!
          </h1>
          <p className="text-2xl text-text-secondary mb-8">
            Hello,{" "}
            <span className="text-accent-cyan font-medium">
              {user?.username}
            </span>
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.15 }}
          className="mb-8 max-w-sm mx-auto"
        >
          <ProfileCard />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.2 }}
          className="flex items-center gap-3 justify-center"
        >
          <Button variant="primary" size="lg" onClick={() => navigate("/chat")}>
            Open Chat
          </Button>
          <Button variant="secondary" size="lg" onClick={handleLogout}>
            Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
