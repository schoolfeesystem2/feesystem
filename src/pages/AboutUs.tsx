import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Play, Smartphone, BookOpen, Users, Shield, Loader2 } from "lucide-react";
import appLogo from "@/assets/app-logo.png";

const AboutUs = () => {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Using raw query since app_settings might not be in generated types yet
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('key, value')
        .in('key', ['android_apk_url', 'demo_video_url']);

      if (error) throw error;

      (data as any[])?.forEach((setting: { key: string; value: string | null }) => {
        if (setting.key === 'android_apk_url') setApkUrl(setting.value);
        if (setting.key === 'demo_video_url') setVideoUrl(setting.value);
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string | null) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <img src={appLogo} alt="School Fee Manager" className="h-16 mx-auto" />
        <h1 className="text-3xl font-bold">About School Fee Manager</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A comprehensive solution for managing school fee collection, student records, and financial reporting.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="p-3 rounded-lg bg-primary/10 w-fit">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Student Management</CardTitle>
            <CardDescription>
              Easily manage student records, admissions, and class assignments with our intuitive interface.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-3 rounded-lg bg-green-500/10 w-fit">
              <BookOpen className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-lg">Fee Tracking</CardTitle>
            <CardDescription>
              Track payments, generate receipts, and monitor outstanding balances in real-time.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="p-3 rounded-lg bg-blue-500/10 w-fit">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle className="text-lg">Secure & Reliable</CardTitle>
            <CardDescription>
              Your data is protected with enterprise-grade security and automatic backups.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Android App Download */}
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-6 flex flex-col justify-center">
            <CardHeader className="p-0 mb-4">
              <div className="p-3 rounded-lg bg-green-500/10 w-fit mb-2">
                <Smartphone className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Download Android App</CardTitle>
              <CardDescription className="text-base">
                Take your school management on the go with our Android app. Access all features from your mobile device.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {apkUrl ? (
                <Button size="lg" className="gap-2" asChild>
                  <a href={apkUrl} download>
                    <Download className="h-5 w-5" />
                    Download APK
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground italic">
                  Android app coming soon. Check back later!
                </p>
              )}
            </CardContent>
          </div>
          <div className="md:w-1/2 bg-gradient-to-br from-green-500/20 to-primary/20 p-8 flex items-center justify-center">
            <div className="relative">
              <div className="w-32 h-56 bg-background rounded-3xl border-4 border-foreground/20 shadow-xl flex items-center justify-center">
                <img src={appLogo} alt="App" className="h-16 w-16" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Demo Video */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500/10">
              <Play className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <CardTitle>How to Use - Demo Video</CardTitle>
              <CardDescription>
                Watch our step-by-step guide to learn how to use all features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {videoUrl ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={getYouTubeEmbedUrl(videoUrl) || videoUrl}
                title="Demo Video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Demo video coming soon!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Our support team is available to assist you with any questions or issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" asChild>
              <a href="/contact">Contact Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutUs;
