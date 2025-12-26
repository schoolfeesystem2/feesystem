import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Mail, BookOpen, CheckCircle2 } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const CONTACT_EMAIL = "schoolfeesystem@gmail.com";
const CONTACT_WHATSAPP = "+254726383188";

const howToUseSteps = [
  { step: 1, title: "Create Fee Structure", description: "Set up your school's fee categories and amounts for each class" },
  { step: 2, title: "Add Students", description: "Register students with their class assignments and parent details" },
  { step: 3, title: "Record Payments", description: "Track fee payments as they come in from students" },
  { step: 4, title: "Generate Reports", description: "View collection reports and outstanding balances" },
  { step: 5, title: "Export Data", description: "Download reports in PDF or Excel format for records" },
];

const Contact = () => {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <img src={appLogo} alt="School Fee System" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contact Us</h1>
          <p className="text-sm text-muted-foreground">Get in touch with our support team</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card className="interactive-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              WhatsApp
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Quick support via WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`https://wa.me/${CONTACT_WHATSAPP.replace(/[^0-9+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium text-sm sm:text-base"
            >
              {CONTACT_WHATSAPP}
            </a>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Available Monday - Friday, 8:00 AM - 6:00 PM
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Email
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Send us an email anytime</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline font-medium text-sm sm:text-base break-all"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              We typically respond within 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How to Use Section */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            How to Use Our System
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Follow these simple steps to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {howToUseSteps.map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-primary">{item.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
                    {item.title}
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contact;