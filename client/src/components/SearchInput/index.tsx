import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function SearchInput(){

  return(
    <div className="relative w-full h-10 bg-dark-secundary mt-4 inset-shadow-[#000000aa] inset-shadow-sm rounded-full">
      <input type="text" placeholder="Digite alguma coisa..." className="w-full h-full px-4 text-zinc-200/60 focus:outline-none" />
      <button className="cursor-pointer text-zinc-200/80"><FontAwesomeIcon icon={faMagnifyingGlass} className="absolute top-1/2 transform -translate-1/2 right-0"/></button>
    </div>
  )

}