import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { GraduationCap } from "lucide-react";
import { z } from "zod";

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { register: registerUser, isRegisterPending, registerError } = useAuth();
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "student",
    },
  });

  // Set role from URL parameter if provided
  useEffect(() => {
    const params = new URLSearchParams(search);
    const roleParam = params.get('role');
    if (roleParam && ['student', 'faculty', 'recruiter', 'admin'].includes(roleParam)) {
      setValue('role', roleParam as any);
    }
  }, [search, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, ...userData } = data;
      await registerUser(userData);
      toast({
        title: "Account created successfully!",
        description: "Welcome to AcademicFolioChain.",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-primary-foreground text-xl" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-muted-foreground">Join AcademicFolioChain today</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register("firstName")}
                  data-testid="register-firstname-input"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register("lastName")}
                  data-testid="register-lastname-input"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@university.edu"
                {...register("email")}
                data-testid="register-email-input"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value) => setValue('role', value as any)} defaultValue="student">
                <SelectTrigger data-testid="register-role-select">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create password"
                {...register("password")}
                data-testid="register-password-input"
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                {...register("confirmPassword")}
                data-testid="register-confirm-password-input"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            {registerError && (
              <p className="text-sm text-destructive">{registerError.message}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegisterPending}
              data-testid="register-submit-button"
            >
              {isRegisterPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login">
                <Button variant="link" className="p-0" data-testid="signin-link">
                  Sign in
                </Button>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
