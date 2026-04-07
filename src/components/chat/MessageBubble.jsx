import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ mensaje }) {
  const isUser = mensaje.rol === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <span className="text-xs font-bold text-primary-foreground">W</span>
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border text-foreground rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p>{mensaje.contenido}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-1 [&_ul]:ml-4 [&_ol]:ml-4"
          >
            {mensaje.contenido}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}