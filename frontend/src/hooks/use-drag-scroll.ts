import { useEffect, type RefObject } from "react";

const LIMIAR_PX = 5; // abaixo disso é clique, não arraste

// Arrastar com o mouse para rolar na horizontal (SKILLHUB_RESPONSIVO_DESKTOP.md, Seção 4.1).
// Só eventos de mouse: touch e trackpad continuam com a rolagem nativa.
// O arraste pode começar em cima de botões e links (o ProdutoCard inteiro é um botão); se o mouse
// andou mais que o limiar, o clique que viria ao soltar é descartado.
// Durante o arraste: cursor "grabbing", sem seleção de texto e sem scroll-snap (senão a fileira
// dá trancos); ao soltar, o snap volta e alinha no card mais próximo.
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let inicioX = 0;
    let inicioScroll = 0;
    let pressionado = false;
    let arrastou = false;

    const rolavel = () => el.scrollWidth > el.clientWidth + 1;
    const atualizarCursor = () => {
      el.style.cursor = rolavel() ? "grab" : "";
    };

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0 || !rolavel()) return;
      pressionado = true;
      arrastou = false;
      inicioX = e.clientX;
      inicioScroll = el!.scrollLeft;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
      if (!pressionado) return;
      const dx = e.clientX - inicioX;
      if (!arrastou && Math.abs(dx) < LIMIAR_PX) return;
      if (!arrastou) {
        arrastou = true;
        el!.style.cursor = "grabbing";
        el!.style.userSelect = "none";
        el!.style.scrollSnapType = "none";
      }
      e.preventDefault();
      el!.scrollLeft = inicioScroll - dx;
    }

    function onMouseUp() {
      pressionado = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (!arrastou) return;
      el!.style.userSelect = "";
      el!.style.scrollSnapType = ""; // volta o snap da classe e alinha no card mais próximo
      atualizarCursor();
    }

    // captura: descarta o clique que encerra um arraste antes de chegar no botão/link do card
    function onClick(e: MouseEvent) {
      if (!arrastou) return;
      e.preventDefault();
      e.stopPropagation();
      arrastou = false;
    }

    // sem isso o navegador "puxa" a imagem ou o link em vez de rolar
    const onDragStart = (e: DragEvent) => e.preventDefault();

    atualizarCursor();
    const observer = new ResizeObserver(atualizarCursor);
    observer.observe(el);
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      observer.disconnect();
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [ref]);
}
