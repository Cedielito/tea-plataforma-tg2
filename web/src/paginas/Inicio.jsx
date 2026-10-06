/**
 * Página de inicio (M-01, RCN-03): mensaje principal, aviso de no diagnóstico y
 * tarjetas de acceso a las secciones (RF-01).
 */
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AvisoNoDiagnostico from '../componentes/AvisoNoDiagnostico.jsx';
import useTituloPagina from '../componentes/useTituloPagina.js';
import { SECCIONES } from '../secciones.js';

export default function Inicio() {
  useTituloPagina(null);

  return (
    <>
      <section className="portada" aria-labelledby="titulo-portada">
        <div className="contenedor portada__interior">
          <p className="portada__antetitulo">Para familias y docentes en Colombia</p>
          <h1 id="titulo-portada">Información confiable sobre el TEA y a dónde acudir</h1>
          <p className="portada__texto">
            Aquí encuentras información clara sobre el trastorno del espectro autista (TEA)
            en niños, niñas y adolescentes de 4 a 17 años, los pasos para pedir una
            valoración y las entidades que te pueden orientar.
          </p>
          <div className="portada__acciones">
            <Link to="/ruta-de-atencion" className="boton boton-primario">
              Ver la ruta de atención
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/que-es-el-tea" className="boton boton-secundario">
              Qué es el TEA
            </Link>
          </div>
          <AvisoNoDiagnostico className="portada__aviso" />
        </div>
      </section>

      <section className="secciones" aria-labelledby="titulo-secciones">
        <div className="contenedor">
          <h2 id="titulo-secciones">¿Qué necesitas saber?</h2>
          <ul className="tarjetas">
            {SECCIONES.map(({ ruta, titulo, descripcion, Icono }) => (
              <li key={ruta}>
                <Link to={ruta} className="tarjeta">
                  <span className="tarjeta__icono" aria-hidden="true">
                    <Icono />
                  </span>
                  <h3 className="tarjeta__titulo">{titulo}</h3>
                  <p className="tarjeta__texto">{descripcion}</p>
                  <span className="tarjeta__ir" aria-hidden="true">
                    Ir a la sección <ArrowRight />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
