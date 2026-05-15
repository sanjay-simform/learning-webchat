import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSignup } from "../../../api-client/services/auth/auth.service";
import type { SignupRequestDto } from "../../../api-client/services/auth/auth.service.dto";
import { FormInput } from "../../../components/FormInput";
import { Button } from "../../../components/Button";
import { motion } from "motion/react";
import { generateCryptoData } from "../../../utils/crypto-utils";
import { useAuth } from "../../../context/AuthContext";

const signUpSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        "Password must contain uppercase, lowercase, digit, and special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export const SignUp = () => {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const [apiError, setApiError] = useState<string | null>(null);
  const { setUser, setCryptoDecryptedPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setApiError(null);
    const payload: SignupRequestDto = {
      username: data.username,
      password: data.password,
    };

    const cryptoData = await generateCryptoData(payload.password);

    const response = await signupMutation.mutateAsync({
      ...payload,
      cryptoData,
    });

    // Type-safe error handling
    if (response.error) {
      let errorMessage = response.error.message;

      if (response.error.status === 409) {
        errorMessage = "Username already exists";
      } else if (response.error.status === 429) {
        errorMessage = "Too many signup attempts. Please try again later.";
      }

      setApiError(errorMessage);
      return;
    }

    // Type-safe success handling
    if (response.data) {
      // Token is automatically stored by the service
      setUser({
        id: response.data.user.id,
        username: response.data.user.username,
        cryptoData,
        password: payload.password,
      });
      await setCryptoDecryptedPassword(cryptoData, payload.password);
      navigate("/chat");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="min-h-screen flex items-center justify-center bg-base px-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md"
      >
        <div className="chat-card p-8 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.1 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-primary mb-2">
              Join WebChat
            </h1>
            <p className="text-text-secondary text-sm">
              Create your account and start chatting
            </p>
          </motion.div>

          {/* Error Alert */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-semantic-danger bg-opacity-10 border border-semantic-danger border-opacity-30 rounded-chat px-4 py-3 text-semantic-danger text-sm"
            >
              {apiError}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.15 }}
            >
              <FormInput
                label="Username"
                type="text"
                placeholder="john_doe"
                {...register("username")}
                error={errors.username?.message}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.2 }}
            >
              <FormInput
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.25 }}
            >
              <FormInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.3 }}
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={signupMutation.isPending}
              >
                Create Account
              </Button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.35 }}
            className="relative flex items-center gap-4"
          >
            <div className="flex-1 h-px bg-obsidian-500 bg-opacity-50" />
            <span className="text-text-muted text-xs font-medium">OR</span>
            <div className="flex-1 h-px bg-obsidian-500 bg-opacity-50" />
          </motion.div>

          {/* Sign In Link */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.4 }}
            className="text-center"
          >
            <p className="text-text-secondary text-sm">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-accent-cyan hover:text-accent-violet transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
