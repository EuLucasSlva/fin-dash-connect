import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lightbulb } from "lucide-react";

interface InsightsAlertsProps {
  insights: string[];
}

const InsightsAlerts = ({ insights }: InsightsAlertsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle>Alertas e Insights</CardTitle>
        </div>
        <CardDescription>Observações automáticas sobre suas finanças.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-2 text-sm border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-yellow-800 dark:text-yellow-200">{insight}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum insight ou alerta gerado no momento.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsAlerts;