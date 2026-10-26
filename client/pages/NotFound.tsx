import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Error 404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        This street is not on the map
      </h1>
      <p className="mt-4 text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/" className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12 rounded-xl px-6 font-bold")}>
        Back to the hazard map
      </Link>
    </div>
  );
};

export default NotFound;
