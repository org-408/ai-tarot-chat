import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";

interface SignInPageProps {
  isOpen: boolean;
  onSignIn: (provider: string, options?: Record<string, unknown>) => void;
  error: string | null;
}

export function SignInPage({ isOpen, onSignIn, error }: SignInPageProps) {
  return (
    <div
      className="fixed inset-0 min-h-screen grid md:grid-cols-2 gap-0 w-full h-full z-100 bg-white"
      style={!isOpen ? { display: "none" } : {}}
    >
      {/* Left side: Login form and OAuth buttons */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-[var(--blue-50)] to-[var(--cyan-50)]">
        <Card className="w-full max-w-md border-[var(--blue-100)] shadow-lg bg-white/80 backdrop-blur-sm rounded-[var(--radius)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-4xl font-normal text-[var(--cyan-600)] font-monte">
              Thread of Knowledge!
            </CardTitle>
            <CardDescription className="text-[var(--cyan-400)] text-base">
              Like Ariadne&apos;s thread through the labyrinth, let AI guide
              your path to wisdom. Navigate the maze of information with
              confidence and clarity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-[var(--blue-200)] hover:bg-[var(--blue-50)] hover:text-[var(--cyan-600)] transition-all"
                onClick={() => onSignIn("google")}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Sign in with Google
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-[var(--blue-200)] hover:bg-[var(--blue-50)] hover:text-[var(--cyan-600)] transition-all"
                onClick={() => onSignIn("github")}
              >
                <FaGithub className="h-5 w-5" />
                Sign in with GitHub
              </Button>
            </div>
            {/* Error message display */}
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right side: Image */}
      <div className="hidden md:block relative bg-gradient-to-tr from-[var(--cyan-100)] via-[var(--blue-50)] to-[var(--blue-100)]">
        <div className="absolute inset-0 bg-center bg-no-repeat bg-contain">
          <Image
            src="/images/ariadne.webp"
            alt="Ariadne"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            fill
            className="object-cover"
            priority
          />
        </div>
        {/* <div className="absolute inset-0 bg-[var(--blue-300)]/10 backdrop-blur-[2px]"></div> */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <h2 className="font-monte text-5xl text-[var(--cyan-800)] drop-shadow-md">
            Ariadne
          </h2>
          <p className="text-[var(--cyan-600)] mt-2">
            Your Guide Through the Labyrinth of Knowledge
          </p>
        </div>
      </div>
    </div>
  );
}
