import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";

export default function TeamSettings({ mode }) {
  const { team, setTeam, user } = useAuth();
  const [name, setName] = useState(team?.name || "");
  const [loc, setLoc] = useState("");
  const canEdit = user?.role !== "member";

  const reload = async () => setTeam((await api.get("/team")).data);

  const saveName = async (e) => {
    e.preventDefault();
    try { await api.put("/team", { name }); await reload(); toast.success("Shop name updated"); } catch (err) { toast.error(errMsg(err)); }
  };
  const addLoc = async (e) => {
    e.preventDefault();
    try { await api.post("/team/locations", { name: loc }); setLoc(""); await reload(); toast.success("Location added"); } catch (err) { toast.error(errMsg(err)); }
  };
  const delLoc = async (l) => {
    if (!window.confirm(`Remove location "${l}"?`)) return;
    try { await api.delete(`/team/locations/${encodeURIComponent(l)}`); await reload(); } catch (err) { toast.error(errMsg(err)); }
  };

  if (mode === "team") {
    return (
      <div className="app-frame min-h-screen" data-testid="team-details-page">
        <TopBar title="Team Details" back="/settings" />
        <form onSubmit={saveName} className="mx-4 mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-card">
          <label className="block"><span className="text-sm font-medium text-gray-500">Shop / team name</span>
            <input data-testid="team-name-input" className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <p className="text-sm text-gray-400">Shown in the blue bar on the Home screen.</p>
          <button data-testid="team-save-button" className="btn-primary w-full">Save</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-frame min-h-screen" data-testid="locations-page">
      <TopBar title="Locations" back="/settings" />
      <div className="mt-3 divide-y divide-gray-100 bg-white" data-testid="locations-list">
        {team?.locations?.map((l) => (
          <div key={l} className="flex items-center justify-between px-5 py-4 text-[18px]" data-testid={`location-row-${l}`}>
            <span>{l}</span>
            {canEdit && team.locations.length > 1 && (
              <button data-testid={`location-delete-${l}`} onClick={() => delLoc(l)} className="text-gray-400"><Trash2 size={20} /></button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <form onSubmit={addLoc} className="mx-4 mt-4 flex gap-2">
          <input data-testid="location-name-input" className="field flex-1" placeholder="New location e.g. Warehouse" value={loc} onChange={(e) => setLoc(e.target.value)} required />
          <button data-testid="location-add-button" className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#2F7CF6] text-white"><Plus /></button>
        </form>
      )}
    </div>
  );
}
