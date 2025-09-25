import { UseFormRegister } from "react-hook-form";
import { FormData } from "@/schemas/registerFormSchema";
import { OrgFormData } from "@/schemas/registerOrgSchema";

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  type: string;
  registerationNormal?: ReturnType<UseFormRegister<FormData>>;
  registerationorg?: ReturnType<UseFormRegister<OrgFormData>>;
  error?: string; // mensagem de erro do Zod
  className?: string;
};

export default function InputField({
  id,
  label,
  type,
  registerationNormal,
  registerationorg,
  error,
  className,
  ...props
}: InputFieldProps) {
  return (
    <div className={`w-full h-[80px] flex flex-col ${className}`}>
      <div className="relative w-full">
        <input
          id={id}
          type={type}
          placeholder=""
          className={`w-full max-w-md lg:w-100 border-b text-zinc-200/80 border-zinc-200/40 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit ${
            error ? "border-red-500 focus:border-red-500" : ""
          }`}
          {...props}
          {...(registerationNormal ?? {})}
          {...(registerationorg ?? {})}
        />
        <label
          htmlFor={id}
          className="absolute -top-4 text-xs text-zinc-200/40 left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm"
        >
          {label}
        </label>
      </div>
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  );
}