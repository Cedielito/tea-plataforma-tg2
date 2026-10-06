/**
 * Formulario de inicio de sesión del panel (M-08, RF-09, RS-05; RA-03, RA-11).
 * Lo usan la página de inicio de sesión y el aviso de sesión vencida.
 *
 * - Etiquetas visibles y autocomplete para que el gestor de contraseñas ayude.
 * - «Mostrar la contraseña» para revisar lo escrito sin tener que recordarlo.
 * - El mensaje del servidor (usuario o contraseña incorrectos, bloqueo por
 *   intentos) se anuncia con role="alert".
 * - La contraseña se borra del formulario después de cada intento.
 */
import { useId, useState } from 'react';
import { LogIn } from 'lucide-react';
import { useSesion } from './ContextoSesion.jsx';
import { mensajeDeError } from './clienteAdmin.js';

export default function FormularioAcceso({ alEntrar }) {
  const { iniciarSesion } = useSesion();
  const id = useId();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState(null);
  const [intentos, setIntentos] = useState(0);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(usuario, clave);
      setClave('');
      alEntrar?.();
    } catch (fallo) {
      setClave('');
      setError(mensajeDeError(fallo));
      setIntentos((n) => n + 1);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario formulario-acceso" onSubmit={alEnviar} noValidate>
      {error && (
        // La clave cambia en cada intento para que el lector de pantalla
        // anuncie el mensaje aunque se repita.
        <p key={intentos} role="alert" className="mensaje mensaje--error">
          {error}
        </p>
      )}
      <div className="campo">
        <label htmlFor={`${id}-usuario`} className="campo__etiqueta">Usuario</label>
        <input
          id={`${id}-usuario`}
          className="campo__control"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${id}-clave`} className="campo__etiqueta">Contraseña</label>
        <input
          id={`${id}-clave`}
          className="campo__control"
          name="clave"
          type={mostrarClave ? 'text' : 'password'}
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        <label className="casilla">
          <input type="checkbox" checked={mostrarClave} onChange={(e) => setMostrarClave(e.target.checked)} />
          Mostrar la contraseña
        </label>
      </div>
      <button type="submit" className="boton boton-primario">
        <LogIn aria-hidden="true" />
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
