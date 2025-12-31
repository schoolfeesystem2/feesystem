import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Check, Calendar, MessageCircle, Mail, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  name: string;
  price: number;
  yearlyPrice: number;
  maxStudents: number;
  features: string[];
  highlighted?: boolean;
}

interface SubscriptionInfo {
  status: string;
  plan: string | null;
  trialEndDate: Date | null;
  subscriptionEndDate: Date | null;
}

const Billing = () => {
  const { toast } = useToast();
  const { user, isExpired } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    status: "trial",
    plan: null,
    trialEndDate: null,
    subscriptionEndDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; type: "monthly" | "yearly" } | null>(null);

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
        "Update Notifications"
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
        "Update Notifications",
        "Priority support"
      ]
    }
  ];

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, trial_end_date, subscription_end_date')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        const trialEnd = data.trial_end_date ? new Date(data.trial_end_date) : null;
        const subEnd = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
        const now = new Date();

        // Check if trial has expired
        let status = data.subscription_status || 'trial';
        if (status === 'trial' && trialEnd && trialEnd < now) {
          status = 'expired';
        }

        setSubscription({
          status,
          plan: data.subscription_plan,
          trialEndDate: trialEnd,
          subscriptionEndDate: subEnd,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = (planName: string, type: "monthly" | "yearly") => {
    setSelectedPlan({ name: planName, type });
    setContactDialogOpen(true);
  };

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-success hover:bg-success">ACTIVE</Badge>;
      case 'trial':
        return <Badge className="bg-primary hover:bg-primary">FREE TRIAL</Badge>;
      case 'expired':
        return <Badge variant="destructive">EXPIRED</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status.toUpperCase()}</Badge>;
    }
  };

  const getExpiryDate = () => {
    if (subscription.status === 'active' && subscription.subscriptionEndDate) {
      return subscription.subscriptionEndDate.toLocaleDateString();
    }
    if ((subscription.status === 'trial' || subscription.status === 'expired') && subscription.trialEndDate) {
      return subscription.trialEndDate.toLocaleDateString();
    }
    return 'N/A';
  };

  const isTrialExpired = subscription.status === 'expired' || isExpired;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your school subscription plan</p>
        </div>
      </div>

      {/* Trial Expired Warning */}
      {isTrialExpired && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Your Free Trial Has Expired</h3>
                <p className="text-sm text-muted-foreground">
                  Please subscribe to a plan to continue using all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan Type</p>
              <p className="text-lg font-semibold">
                {subscription.status === 'trial' ? 'Free Trial' : subscription.plan || 'No Plan'}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription.status === 'trial' ? '7 days free access' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {subscription.status === 'active' ? 'Renewal Date' : 'Expiry Date'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{getExpiryDate()}</span>
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

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request {selectedPlan?.name}</DialogTitle>
            <DialogDescription>
              Contact us to subscribe to the {selectedPlan?.type} plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To complete your subscription request, please contact us through any of the following channels:
            </p>
            
            <div className="space-y-3">
              <a 
                href="https://wa.me/254726383188" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <MessageCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">+254 726 383 188</p>
                </div>
              </a>

              <a 
                href="mailto:schoolfeesystem@gmail.com?subject=Subscription Request: ${selectedPlan?.name} (${selectedPlan?.type})"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <Mail className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">Email</p>
                  <p className="text-sm text-muted-foreground">schoolfeesystem@gmail.com</p>
                </div>
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Please include your school name and preferred payment method when contacting us.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
