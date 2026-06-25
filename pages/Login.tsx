import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Film } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      toast.success("Welcome to SmileFlex CMS!");
    } else {
      toast.error("Invalid email or password");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center gradient-radial p-4">
      <div className="w-full max-w-md glass rounded-3xl p-10 shadow-elegant animate-scale-in">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-glow">
            <Film className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center text-gradient mb-1">SmileFlex</h1>
        <p className="text-center text-muted-foreground mb-8">CMS Dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smileflex.com"
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl gradient-brand text-primary-foreground font-semibold hover:shadow-glow hover:-translate-y-0.5 transition-all"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 p-4 rounded-xl bg-secondary/50 text-xs text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">Admin:</span> admin@smileflex.com / admin123</p>
          <p><span className="text-foreground font-medium">Editor:</span> editor@smileflex.com / editor123</p>
        </div>
      </div>
    </main>
  );
}
