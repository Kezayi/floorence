import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getRelationCategory, type RelationCategoryName } from "@/lib/relationCategoryUtils";

const CATEGORY_COLORS: Record<RelationCategoryName, string> = {
  "Famille directe": "#FF0000",
  "Famille élargie": "#FFD700",
  "Alliés": "#008000",
  "Socio cœur (Amis)": "#0000FF",
  "Autres": "#000000",
};

const CATEGORY_ORDER: RelationCategoryName[] = [
  "Famille directe",
  "Famille élargie",
  "Alliés",
  "Socio cœur (Amis)",
  "Autres",
];

interface Props {
  posts: Array<{
    relationCategory: string;
    relationLink?: string | null;
  }>;
}

const MemorialSocialDonut = ({ posts }: Props) => {
  const data = useMemo(() => {
    const counts: Record<RelationCategoryName, number> = {
      "Famille directe": 0,
      "Famille élargie": 0,
      "Alliés": 0,
      "Socio cœur (Amis)": 0,
      "Autres": 0,
    };

    posts.forEach((post) => {
      const key = post.relationLink || post.relationCategory;
      const cat = getRelationCategory(key);
      counts[cat]++;
    });

    return CATEGORY_ORDER
      .map((name) => ({
        name,
        value: counts[name],
        color: CATEGORY_COLORS[name],
      }))
      .filter((d) => d.value > 0);
  }, [posts]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) return null;

  return (
    <div className="bg-card/80 border border-border/50 rounded-sm p-5">
      <h4 className="text-sm font-medium text-muted-foreground mb-4 font-sans">
        Répartition Sociale
      </h4>
      <div className="flex items-center gap-6">
        <div className="w-[160px] h-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(0)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center justify-between px-2 py-1 text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color, boxShadow: cat.name === "Famille élargie" ? "0 0 0 1px rgba(0,0,0,0.15)" : undefined }}
                />
                <span className="text-xs font-sans text-foreground">{cat.name}</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {((cat.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MemorialSocialDonut;
