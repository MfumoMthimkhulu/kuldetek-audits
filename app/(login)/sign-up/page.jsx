"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import SVGLogo from "@/components/svg-logo";


const schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  country: z.string().min(2),
  phone: z.string().min(5),
  certificationDocument: z.any().refine((file) => file?.[0], "PDF is required"),
});

export default function AuditorSignUpForm() {
  const supabase = createClient();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const { fullName, email, password, country, phone, certificationDocument } = data;

    try {
      // Upload PDF to Supabase Storage
      const file = certificationDocument[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `certs/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("certifications")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicURLData } = supabase.storage
        .from("certifications")
        .getPublicUrl(filePath);

      const certUrl = publicURLData.publicUrl;

      // Create user in Supabase Auth
   const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      phone,
      country,
      cert_url: certUrl,
      role: "user", // ✅ Set default role here
    },
  },
});


      if (signUpError) throw signUpError;

      const user = authData?.user;
      if (!user) throw new Error("User creation failed");

      // Insert metadata into users table
     const { error: insertError } = await supabase.from("profiles").insert([
  {
    id: user.id,
    email,
    full_name: fullName,
    country,
    phone,
    cert_url: certUrl,
    is_certified: false,
    role: "user", // ✅ Default role
  },
]);


      if (insertError) throw insertError;

      router.push("/dashboard");
    } catch (err) {
      console.error("Signup error:", err);
      alert("Signup failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <SVGLogo />
        </div>
        <h1 className="text-2xl font-semibold text-center">Auditor Signup</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Full Name" {...register("fullName")} />
          {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}

          <Input type="email" placeholder="Email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

          <Input type="password" placeholder="Password" {...register("password")} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}

          <Input placeholder="Country" {...register("country")} />
          {errors.country && <p className="text-red-500 text-sm">{errors.country.message}</p>}

          <Input placeholder="Phone" {...register("phone")} />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}

          <Input type="file" accept="application/pdf" {...register("certificationDocument")} />
          {errors.certificationDocument && (
            <p className="text-red-500 text-sm">{errors.certificationDocument.message}</p>
          )}

          <Button type="submit" className="w-full h-12">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
          </Button>
        </form>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <a href="/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
