import { useEffect, useMemo, useRef, useState } from 'react';
import { PenLine, RefreshCw, Save, StickyNote, Trash2 } from 'lucide-react';
import { type NoteScope, useOperations } from '../context/OperationsContext';

interface NotesBoardProps {
  scope: NoteScope;
  ownerId?: string;
  relatedTemplateId?: string;
  title?: string;
  description?: string;
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function prepareCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#1e293b';
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}

export function NotesBoard({
  scope,
  ownerId,
  relatedTemplateId,
  title = 'Заметки и зарисовки',
  description = 'Быстрые заметки, комментарии и простые схемы по текущим задачам.',
}: NotesBoardProps) {
  const { notes, addNote, deleteNote } = useOperations();

  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [hasSketch, setHasSketch] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    prepareCanvas(canvasRef.current);
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (note.scope !== scope) return false;
      if (ownerId && note.ownerId !== ownerId) return false;
      if (relatedTemplateId && note.relatedTemplateId !== relatedTemplateId) return false;
      return true;
    });
  }, [notes, ownerId, relatedTemplateId, scope]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getPoint(event);
    drawingRef.current = true;
    setHasSketch(true);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const handleClearSketch = () => {
    prepareCanvas(canvasRef.current);
    setHasSketch(false);
  };

  const handleSave = () => {
    const normalizedTitle = draftTitle.trim();
    const normalizedContent = draftContent.trim();
    const sketch = hasSketch ? canvasRef.current?.toDataURL('image/png') : undefined;

    if (!normalizedTitle && !normalizedContent && !sketch) {
      return;
    }

    addNote({
      scope,
      ownerId,
      relatedTemplateId,
      title: normalizedTitle || 'Заметка',
      content: normalizedContent,
      sketch,
    });

    setDraftTitle('');
    setDraftContent('');
    handleClearSketch();
  };

  return (
    <section className="zan-section-card rounded-[2rem] p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <StickyNote className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="zan-input w-full px-4 py-3 text-sm"
            placeholder="Заголовок заметки"
          />
          <textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            className="zan-textarea min-h-[150px] w-full px-4 py-3 text-sm"
            placeholder="Короткая заметка, мысль или комментарий"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} className="zan-toolbar-button zan-toolbar-button-primary">
              <Save className="h-4 w-4" />
              Сохранить заметку
            </button>
            <button onClick={handleClearSketch} className="zan-toolbar-button zan-toolbar-button-secondary">
              <RefreshCw className="h-4 w-4" />
              Очистить рисунок
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PenLine className="h-4 w-4 text-blue-600" />
            Поле для быстрых зарисовок
          </div>
          <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-3">
            <canvas
              ref={canvasRef}
              width={900}
              height={260}
              className="h-[220px] w-full cursor-crosshair rounded-[1rem] bg-white"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Здесь пока нет заметок.
          </div>
        ) : (
          filteredNotes.map((note) => (
            <article key={note.id} className="zan-muted-card rounded-[1.6rem] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">{note.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">Обновлено: {formatDateTime(note.updatedAt)}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Удалить
                  </span>
                </button>
              </div>
              {note.content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{note.content}</p> : null}
              {note.sketch ? (
                <div className="mt-4 overflow-hidden rounded-[1rem] border border-slate-200 bg-white p-2">
                  <img src={note.sketch} alt={note.title} className="h-auto w-full rounded-xl object-contain" />
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
