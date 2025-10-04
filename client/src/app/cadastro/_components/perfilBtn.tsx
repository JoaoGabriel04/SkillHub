import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { forwardRef } from "react";

type Props = {
  icon: IconDefinition;
  title: string;
  opcao: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const PerfilBtn = forwardRef<HTMLLabelElement, Props>(
  ({ icon, title, opcao, checked, onChange }, ref) => {
    return (
      <label
        htmlFor={opcao}
        ref={ref}
        className={`group opacity-0 group relative w-32 h-36 lg:w-48 lg:h-56 bg-dark-primary rounded-lg flex flex-col justify-center items-center hover:border-blue-600 border-2 hover:text-blue-600 cursor-pointer transition-colors ${
          checked ? "border-blue-600 !border-2 text-blue-600" : "text-zinc-100"
        }`}
      >
        {/* wrapper do radio */}
        <div className="absolute top-2 right-2 flex items-center cursor-pointer">
          <input
            type="radio"
            name="perfil"
            id={opcao}
            className="peer hidden"
            checked={checked}
            onChange={onChange}
          />
          <span className="relative inline-block w-3 h-3 lg:w-4 lg:h-4 border-2 border-dark-primary rounded-full duration-200 peer-checked:border-blue-600"></span>
          <span className="absolute top-1/2 left-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-blue-600 opacity-0 peer-checked:opacity-100 group-hover:opacity-100 duration-200 transform -translate-x-1/2 -translate-y-1/2"></span>
        </div>

        {/* ícone */}
        <div className={`w-20 h-20 lg:w-28 lg:h-28 bg-dark-primary border-2 rounded-full flex justify-center items-center mb-4
          ${checked ? "border-blue-600" : "border-zinc-100"}
          group-hover:border-blue-600 transition-colors`}>
          <FontAwesomeIcon icon={icon} className="text-3xl lg:text-4xl" />
        </div>

        {/* texto */}
        <span className="text-zinc-200 text-sm lg:text-lg font-medium mt-2 lg:mt-4">
          {title}
        </span>
      </label>
    );
  }
);

export default PerfilBtn;
PerfilBtn.displayName = "PerfilBtn";
