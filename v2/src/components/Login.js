'use client';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function Login() {
    const { googleSignIn } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 px-4">
            <Card className="w-full max-w-md shadow-lg border-muted">
                <CardHeader className="text-center space-y-2 pb-8">
                    <CardTitle className="text-4xl font-extrabold tracking-tight">RunsheetPro</CardTitle>
                    <CardDescription className="text-base">
                        Plan your events with ease. Login to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button
                        variant="default"
                        size="lg"
                        className="w-full font-semibold gap-2 h-12"
                        onClick={googleSignIn}
                    >
                        <GoogleIcon fontSize="small" /> Sign in with Google
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col text-center text-xs text-muted-foreground pt-4">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </CardFooter>
            </Card>
        </div>
    );
}
