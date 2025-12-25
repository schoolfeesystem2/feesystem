import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Check, Calendar } from "lucide-react";

interface Plan {
  name: string;
  price: number;
  yearlyPrice: number;
  maxStudents: number;
  features: string[];
  highlighted?: boolean;
}

const Billing = () => {
  const { toast } = useToast();
  const [currentPlan] = useState("Small");
  const [nextPaymentDate] = useState("20/01/2026");

  const plans: Plan[] = [
    {
      name: "Small Plan",
      price: 999.99,
      yearlyPrice: 9999.99,
      maxStudents: 200,
      features: [
        "Up to 200 students",
        "Fee management",
        "Payment tracking",
        "Basic reports"
      ]
    },
    {
      name: "Medium Plan",
      price: 1499.99,
      yearlyPrice: 14999.99,
      maxStudents: 500,
      features: [
        "Up to 500 students",
        "Fee management",
        "Payment tracking",
        "Advanced reports",
        "SMS notifications"
      ],
      highlighted: true
    },
    {
      name: "Large Plan",
      price: 1999.99,
      yearlyPrice: 19999.99,
      maxStudents: 1000,
      features: [
        "Up to 1000 students",
        "Fee management",
        "Payment tracking",
        "Advanced reports",
        "SMS notifications",
        "Priority support"
      ]
    }
  ];

  const handleRequest = (planName: string, type: "monthly" | "yearly") => {
    toast({
      title: "Request Sent",
      description: `Your request for ${planName} (${type}) has been submitted. We'll contact you shortly.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your school subscription plan</p>
        </div>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1 bg-success hover:bg-success">ACTIVE</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan Type</p>
              <p className="text-lg font-semibold">{currentPlan}</p>
              <p className="text-sm text-muted-foreground">Max 20 students</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Payment Date</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{nextPaymentDate}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.highlighted ? 'border-primary border-2' : ''}`}
          >
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-3xl font-bold">Ksh {plan.price.toLocaleString()}</span>
                <span className="text-muted-foreground"> per month</span>
              </div>
              <p className="text-primary font-semibold mt-2">
                Ksh {plan.yearlyPrice.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">per year (2 months free)</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => handleRequest(plan.name, "monthly")}
                >
                  Request Monthly
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleRequest(plan.name, "yearly")}
                >
                  Request Yearly
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Billing;
