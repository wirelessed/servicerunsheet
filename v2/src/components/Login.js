'use client';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
    {
        icon: "edit_calendar",
        title: "Live Runsheets",
        desc: "Real-time updates keep your whole team in sync — no refresh, no confusion, no missed cues.",
    },
    {
        icon: "groups",
        title: "Role-Based Access",
        desc: "Assign editors, ops, and viewers with per-role permissions built for production workflows.",
    },
    {
        icon: "bolt",
        title: "Built for Speed",
        desc: "A fast, mobile-friendly interface, now in dark mode.",
    },
];

const whatsNew = [
    { icon: "dark_mode", title: "Dark Mode" },
    { icon: "folder_shared", title: "Groups & Share Group" },
    { icon: "search", title: "Search & Sort" },
    { icon: "history", title: "Past Events Auto-Grouped" },
    { icon: "picture_as_pdf", title: "Export as PDF" },
    { icon: "support_agent", title: "New & Improved Ops Role" },
];

export default function Login() {
    const { googleSignIn } = useAuth();

    return (
        <div className="landing-bg relative min-h-screen bg-background overflow-hidden">

            {/* ── Background blobs ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute -top-[40%] -left-[20%] w-[700px] h-[700px] rounded-full bg-primary/8 blur-[140px] animate-pulse"
                    style={{ animationDuration: '6s' }}
                />
                <div
                    className="absolute -bottom-[30%] -right-[15%] w-[600px] h-[600px] rounded-full bg-primary/6 blur-[120px] animate-pulse"
                    style={{ animationDuration: '8s', animationDelay: '2s' }}
                />
                <div
                    className="absolute top-[35%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px] animate-pulse"
                    style={{ animationDuration: '7s', animationDelay: '1s' }}
                />
            </div>

            {/* ── Dot grid overlay ── */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            {/* ── Nav + Hero band ── */}
            <div className="hero-gradient relative z-10 min-h-[75svh] flex flex-col">

                {/* ── Navbar ── */}
                <nav className="flex items-center justify-between px-6 py-5 md:px-12">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 shadow-sm">
                            <span className="material-symbols-outlined text-primary text-xl icon-filled">event_note</span>
                        </div>
                        <span className="font-extrabold text-lg tracking-tight text-foreground">RunsheetPro</span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-full">
                        v4
                    </Badge>
                </nav>

                {/* ── Hero ── */}
                <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 page-enter">

                    <Badge
                        variant="outline"
                        className="mb-6 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary border-primary/30 bg-primary/5 rounded-full"
                    >
                        ✦ &nbsp;v4: built for much more
                    </Badge>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-3xl leading-[1.08]">
                        Create Runsheets<br />
                        <span className="gradient-text">like a pro.</span>
                    </h1>
                    {/* 
                <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
                    Plan, manage, and operate your events with precision — built for production teams that move fast.
                </p> */}

                    {/* CTA — centered & prominent on mobile */}
                    <div className="mt-8 w-full max-w-xs flex flex-col items-center gap-3">
                        <Button
                            variant="default"
                            size="lg"
                            className="w-full font-semibold gap-3 h-12 text-[15px] rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 active:scale-[0.98] pulse-glow"
                            onClick={googleSignIn}
                        >
                            <GoogleIcon style={{ fontSize: 20 }} />
                            Log in with Google
                        </Button>
                        <p className="text-[11px] text-muted-foreground">Free to use · No credit card required</p>
                    </div>
                </section>
            </div>{/* end hero-gradient band */}

            {/* ── Content band (What's New onwards) ── */}
            <div className="relative z-10 border-t border-border/60 bg-muted/40 dark:bg-white/[0.03]">

                {/* ── What's New in v4 ── */}
                <section className="px-6 py-16 md:px-12 md:py-20">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs font-bold px-3 py-1 rounded-full">
                                    v4
                                </Badge>
                                <h2 className="text-2xl md:text-3xl font-bold text-foreground">What's New</h2>
                            </div>
                            <p className="text-muted-foreground text-sm md:text-base mt-1">
                                Last Updated: May 2026
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {whatsNew.map((item) => (
                                <div
                                    key={item.title}
                                    className="glass card-hover rounded-xl border border-border/50 p-4 flex items-center gap-3"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-primary text-[18px] icon-filled">
                                            {item.icon}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-foreground leading-tight">{item.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Feature highlights ── */}
                <section className="px-6 py-16 md:px-12 md:py-20">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                                Everything your team needs
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base">
                                Designed for the reality of live event production.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {features.map((f) => (
                                <div
                                    key={f.title}
                                    className="glass card-hover rounded-2xl border border-border/50 p-6"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4 shadow-sm">
                                        <span className="material-symbols-outlined text-primary icon-filled">{f.icon}</span>
                                    </div>
                                    <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ── */}
                <section className="px-6 py-16 md:py-24">
                    <div className="max-w-md mx-auto text-center">
                        <div className="glass rounded-2xl border border-border/50 p-8 shadow-xl">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/15 mb-5 shadow-sm">
                                <span className="material-symbols-outlined text-primary text-3xl icon-filled">event_note</span>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to get started?</h2>
                            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
                                Join production teams worldwide running their events with RunsheetPro.
                            </p>
                            <Button
                                variant="default"
                                size="lg"
                                className="w-full font-semibold gap-3 h-12 text-[15px] rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 active:scale-[0.98]"
                                onClick={googleSignIn}
                            >
                                <GoogleIcon style={{ fontSize: 20 }} />
                                Log in with Google
                            </Button>

                            <div className="mt-6 flex items-center gap-3">
                                <div className="flex-1 h-px bg-border/60" />
                                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">SECURE LOGIN</span>
                                <div className="flex-1 h-px bg-border/60" />
                            </div>

                            <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                                By signing in, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </div>
                    </div>
                </section>
            </div>{/* end content band */}

            {/* ── Footer ── */}
            <footer className="relative z-10 text-center py-8 pb-12">
                <p className="text-[11px] text-muted-foreground/60">
                    © 2026 RunsheetPro · Built for production teams
                </p>
            </footer>

        </div>
    );
}
