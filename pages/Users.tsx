import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import DashboardLayout from "@/components/cms/DashboardLayout";
import Modal from "@/components/cms/Modal";
import { Field, inputCls } from "@/components/cms/FormField";
import { User, Role, getUsers, setUsers, generateId } from "@/lib/cms-storage";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("editor");

  const refresh = () => setList(getUsers());
  useEffect(refresh, []);

  if (!isAdmin) return <Navigate to="/cms/movies" replace />;

  const save = () => {
    if (!email.trim() || !password.trim()) return toast.error("Email and password are required");
    if (getUsers().some((u) => u.email === email)) return toast.error("Email already exists");
    setUsers([...getUsers(), { id: generateId(), email: email.trim(), password, role }]);
    setOpen(false); setEmail(""); setPassword(""); setRole("editor");
    refresh();
    toast.success("User created");
  };

  const remove = (id: string, em: string) => {
    if (em === "admin@smileflex.com") return toast.error("Cannot delete the default admin");
    if (!confirm("Delete this user?")) return;
    setUsers(getUsers().filter((u) => u.id !== id));
    refresh();
    toast.success("User deleted");
  };

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage CMS access and roles</p>
        </div>
        <button onClick={() => setOpen(true)} className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold flex items-center gap-2 hover:shadow-glow hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </header>

      <div className="gradient-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-muted-foreground"><UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />No users yet</td></tr>
            ) : list.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                <td className="px-6 py-4 font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-sm font-semibold text-primary-foreground">{u.email[0].toUpperCase()}</div>
                  {u.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs uppercase tracking-wider px-2.5 py-1 rounded font-semibold ${u.role === "admin" ? "bg-primary/20 text-primary-glow" : "bg-secondary text-muted-foreground"}`}>{u.role}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  {u.email !== "admin@smileflex.com" && (
                    <button onClick={() => remove(u.id, u.email)} className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add User"
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 font-medium transition-colors">Cancel</button>
            <button onClick={save} className="px-5 py-2.5 rounded-xl gradient-brand text-primary-foreground font-semibold hover:shadow-glow transition-all">Save User</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Role">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="editor">Editor (Limited Access)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </Field>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
