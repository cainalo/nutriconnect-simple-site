import { td } from "@/lib/i18n/data";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  ChefHat,
  MessageSquare,
  Clock,
  CalendarDays,
  ArrowRight,
  Send,
  HelpCircle,
  Award,
  Trash2,
  Lock,
  Share2,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Flag,
  Link as LinkIcon,
  UserRound,
  Reply,
} from "lucide-react";
import { ConfirmAction } from "@/components/confirm-action";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import { VerifiedBadge } from "@/components/person-chip";
import { PostCardFrame } from "@/components/post-card-frame";
import { postDisplayImage } from "@/lib/post-type";
import { PostImage } from "@/components/post-image";
import { ReportButton, ReportDialog } from "@/components/report-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useProfessionalMap } from "@/lib/social/professionals-queries";
import { useCommunities } from "@/lib/social/communities-queries";
import type { RemoteChallenge } from "@/lib/social/challenges";
import { ThemePoll } from "@/components/theme-poll";
import { formatWeekStart, localizeTheme, type RemoteTheme } from "@/lib/social/themes";
import { useJoinChallenge, useLeaveChallenge } from "@/lib/social/challenges-queries";
import {
  useAddComment,
  useCommentReplies,
  useDeleteComment,
  useDeletePost,
  useToggleReaction,
} from "@/lib/social/feed-queries";
import {
  type Comment,
  type Post,
  type PostBlock,
  normalizeBlockOrder,
  formatDate,
  getAvatarSrc,
  initials,
} from "@/lib/community";
import { BuyAtMarket } from "@/components/buy-at-market";
import { EmojiIcon } from "@/components/emoji-icon";
import { shareContent } from "@/lib/native";
import { useTr } from "@/components/settings-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToggleSaved } from "@/lib/social/feed-queries";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const tr = useTr();
  // Compartilhar do sistema (no app Android, o nativo); sem ele, copia o link do post.
  const postUrl = () => `${window.location.origin}/explorar?post=${post.id}`;
  const sharePost = async () => {
    const title = (post.title || post.text || "NutriConnect").slice(0, 120);
    if (await shareContent({ title, text: title, url: postUrl() })) return;
    await copyPostLink();
  };
  const copyPostLink = async () => {
    const url = postUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tr(["Link copiado!", "Link copied!", "¡Enlace copiado!", "Lien copié !"]));
    } catch {
      toast.error(url);
    }
  };
  const professionals = useProfessionalMap(!post.authorRole);
  // Comunidade do post (link no cabeçalho): do banco.
  const communitiesQuery = useCommunities(false, !!user && !!post.communityId);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyName, setReplyName] = useState("");
  const commentInput = useRef<HTMLInputElement>(null);
  const [reporting, setReporting] = useState(false);
  const toggleSaved = useToggleSaved();

  const toggleReaction = useToggleReaction();
  const addRemoteComment = useAddComment();
  const deleteRemoteComment = useDeleteComment();
  const deleteRemotePost = useDeletePost();
  const commentReplies = useCommentReplies(post.id, showComments && !!user);

  const currentUserId = user?.id || "guest";
  const isOwnPost = !!user && post.authorId === user.id;
  const hasSupported = (post.supports || []).includes(currentUserId);
  const supportCount = (post.supports || []).length;

  const hasPrepared = (post.preparedBy || []).includes(currentUserId);
  const preparedCount = (post.preparedBy || []).length;

  const handleSupport = () => {
    playSound("support");
    if (!user) {
      toast.info(t("common.loginToSupport"));
      return;
    }
    toggleReaction.mutate({
      postId: post.id,
      kind: "apoiar",
      on: !hasSupported,
      userId: user.id,
    });
  };

  const handlePrepared = () => {
    if (!user) {
      toast.info(t("common.loginToPrepared"));
      return;
    }
    toggleReaction.mutate({
      postId: post.id,
      kind: "preparei",
      on: !hasPrepared,
      userId: user.id,
    });
    if (!hasPrepared) {
      toast.success(t("postcard.preparedSuccess"));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info(t("common.loginToComment"));
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;

    try {
      await addRemoteComment.mutateAsync({
        postId: post.id,
        text: trimmed,
        replyTo: replyTo ?? undefined,
      });
      setCommentText("");
      setReplyTo(null);
      toast.success(t("postcard.commentPublished"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("postcard.commentError"));
    }
  };

  const displayImage = postDisplayImage(post);

  const avatarImage = getAvatarSrc(post.authorId, post.authorAvatar);
  const authorIsProfessional = post.authorRole
    ? post.authorRole === "profissional"
    : professionals.map.has(post.authorId);

  const community = post.communityId
    ? (communitiesQuery.data ?? []).find((c) => c.id === post.communityId)
    : null;

  // --- RENDERS COMUNS ---
  const underReview = isOwnPost && post.hidden === true;
  const reviewNotice = underReview ? (
    <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-warning/15 px-3 py-2 text-xs font-medium text-warning-foreground">
      <Clock className="h-3.5 w-3.5 shrink-0" /> {t("postcard.underReview")}
    </p>
  ) : null;

  const renderAuthorInfo = () => (
    <>
      {reviewNotice}
      {renderAuthorHeader()}
    </>
  );

  const renderAuthorHeader = () => (
    <div className="flex flex-wrap items-start justify-between mb-4 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/perfil/$userId"
          params={{ userId: post.authorId }}
          className="grid h-10 w-10 overflow-hidden place-items-center rounded-full avatar-shape bg-primary-soft text-sm font-bold text-primary transition hover:opacity-80 shrink-0"
        >
          {avatarImage ? (
            <img src={avatarImage} alt={post.authorName} className="h-full w-full object-cover" />
          ) : (
            initials(post.authorName)
          )}
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              to="/perfil/$userId"
              params={{ userId: post.authorId }}
              className="font-semibold text-foreground hover:underline text-sm truncate"
            >
              {post.authorName}
            </Link>
            {authorIsProfessional && <VerifiedBadge />}
          </div>
          <p className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-1">
            {formatDate(post.createdAt)}
            {post.audience === "amigos" && (
              <span className="inline-flex items-center gap-0.5" title={t("sm.audience.friends")}>
                · <Lock className="h-3 w-3" /> {t("sm.audience.friends")}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {community && (
          <Link
            to="/comunidades/$slug"
            params={{ slug: community.slug }}
            className="shrink-0 text-[10px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded-md transition border border-border"
          >
            {t("postcard.fromCommunity")} <span className="text-accent">{community.name}</span>
          </Link>
        )}
        {
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={tr(["Mais opções", "More options", "Más opciones", "Plus d'options"])}
              title={tr(["Mais opções", "More options", "Más opciones", "Plus d'options"])}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {user && (
                <DropdownMenuItem
                  onSelect={() => toggleSaved.mutate({ postId: post.id, saved: !post.saved })}
                >
                  {post.saved ? (
                    <BookmarkCheck className="h-4 w-4 text-accent" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                  {post.saved
                    ? tr([
                        "Tirar dos salvos",
                        "Remove from saved",
                        "Quitar de guardados",
                        "Retirer des enregistrés",
                      ])
                    : tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void sharePost()}>
                <Share2 className="h-4 w-4" />
                {tr(["Compartilhar", "Share", "Compartir", "Partager"])}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyPostLink()}>
                <LinkIcon className="h-4 w-4" />
                {tr(["Copiar link", "Copy link", "Copiar enlace", "Copier le lien"])}
              </DropdownMenuItem>
              {!isOwnPost && (
                <DropdownMenuItem asChild>
                  <Link to="/perfil/$userId" params={{ userId: post.authorId }}>
                    <UserRound className="h-4 w-4" />
                    {tr([
                      "Ver perfil do autor",
                      "See author's profile",
                      "Ver perfil del autor",
                      "Voir le profil de l'auteur",
                    ])}
                  </Link>
                </DropdownMenuItem>
              )}
              {(isOwnPost || (user && !isOwnPost)) && <DropdownMenuSeparator />}
              {isOwnPost && (
                <DropdownMenuItem
                  onSelect={() => setConfirmDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("cf.removePost")}
                </DropdownMenuItem>
              )}
              {user && !isOwnPost && (
                <DropdownMenuItem
                  onSelect={() => setReporting(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="h-4 w-4" />
                  {tr(["Denunciar", "Report", "Denunciar", "Signaler"])}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      </div>
      <ConfirmAction
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={tr([
          "Apagar este post?",
          "Delete this post?",
          "¿Borrar este post?",
          "Supprimer ce post ?",
        ])}
        description={tr([
          "O post, os comentários e as reações somem para todos. Não dá para desfazer.",
          "The post, comments and reactions disappear for everyone. This can't be undone.",
          "El post, los comentarios y las reacciones desaparecen para todos. No se puede deshacer.",
          "Le post, les commentaires et les réactions disparaissent pour tous. Action définitive.",
        ])}
        confirmLabel={t("cf.removePost")}
        onConfirm={() => deleteRemotePost.mutate(post.id)}
      />
      <ReportDialog
        targetType="post"
        targetId={post.id}
        open={reporting}
        onOpenChange={setReporting}
      />
    </div>
  );

  // Fios: respostas ficam embaixo do comentário de origem (um nível).
  const replyMap = commentReplies.data ?? {};
  const allComments = post.comments ?? [];
  const parentOf = (c: Comment) => c.replyTo ?? replyMap[c.id];
  const rootComments = allComments.filter(
    (c) => !parentOf(c) || !allComments.some((x) => x.id === parentOf(c)),
  );
  const repliesOf = (id: string) => allComments.filter((c) => parentOf(c) === id);

  const renderComment = (c: Comment, isReply = false) => {
    const avatar = getAvatarSrc(c.authorId, c.authorAvatar);
    const canDelete = !!user && (c.authorId === user.id || isOwnPost);
    return (
      <div
        key={c.id}
        className={`flex gap-2.5 rounded-2xl p-3 text-sm ${isReply ? "bg-secondary/25" : "bg-secondary/40"}`}
      >
        <Link
          to="/perfil/$userId"
          params={{ userId: c.authorId }}
          onClick={() => setShowComments(false)}
          className="avatar-shape grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-[11px] font-bold text-primary transition hover:opacity-80"
          aria-label={c.authorName}
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(c.authorName)
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <Link
              to="/perfil/$userId"
              params={{ userId: c.authorId }}
              onClick={() => setShowComments(false)}
              className="truncate text-xs font-bold text-foreground hover:underline"
            >
              {c.authorName}
            </Link>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDate(c.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 text-left text-xs leading-relaxed text-foreground/90">{c.text}</p>
          <div className="-ml-2 mt-1 flex flex-wrap items-center">
            {user && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(isReply ? (parentOf(c) ?? c.id) : c.id);
                  setReplyName(c.authorName);
                  commentInput.current?.focus();
                }}
                className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <Reply className="h-3.5 w-3.5" aria-hidden />
                {tr(["Responder", "Reply", "Responder", "Répondre"])}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                disabled={deleteRemoteComment.isPending}
                onClick={() => setCommentToDelete(c.id)}
                aria-label={t("cf.removeComment")}
                title={t("cf.removeComment")}
                className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {user && c.authorId !== user.id && (
              <ReportButton
                targetType="comment"
                targetId={c.id}
                className="min-h-10 rounded-full px-2"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCommentsDialog = () => (
    <Dialog
      open={showComments}
      onOpenChange={(o) => {
        setShowComments(o);
        if (!o) setReplyTo(null);
      }}
    >
      <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-base font-bold font-display">
            {t("postcard.conversation")}
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            {post.authorName}
            {(post.title || post.text) && ` · ${post.title || post.text}`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {rootComments.length > 0 ? (
            rootComments.map((c) => (
              <div key={c.id} className="space-y-2">
                {renderComment(c)}
                {repliesOf(c.id).length > 0 && (
                  <div className="ml-6 space-y-2 border-l-2 border-border/60 pl-3">
                    {repliesOf(c.id).map((r) => renderComment(r, true))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-secondary/20 py-6 text-center text-sm text-muted-foreground">
              {t("postcard.beFirstToComment")}
            </p>
          )}
        </div>

        <form onSubmit={handleAddComment} className="shrink-0 border-t border-border/60 px-5 py-3">
          {replyTo && (
            <p className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1">
                <Reply className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {tr(["Respondendo a", "Replying to", "Respondiendo a", "Réponse à"])}{" "}
                  <strong className="text-foreground">{replyName}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="min-h-10 shrink-0 rounded-full px-2 font-semibold hover:text-foreground"
              >
                {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
              </button>
            </p>
          )}
          <div className="flex gap-2">
            <input
              ref={commentInput}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("postcard.commentPlaceholder")}
              aria-label={t("postcard.commentPlaceholder")}
              className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-accent"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              aria-label={t("postcard.sendComment")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
        <ConfirmAction
          open={!!commentToDelete}
          onOpenChange={(o) => !o && setCommentToDelete(null)}
          title={tr([
            "Apagar este comentário?",
            "Delete this comment?",
            "¿Borrar este comentario?",
            "Supprimer ce commentaire ?",
          ])}
          description={tr([
            "Ele some da conversa para todos, com as respostas. Não dá para desfazer.",
            "It disappears from the conversation for everyone, with its replies. This can't be undone.",
            "Desaparece de la conversación para todos, con sus respuestas. No se puede deshacer.",
            "Il disparaît de la conversation pour tous, avec ses réponses. Action définitive.",
          ])}
          confirmLabel={t("cf.removeComment")}
          onConfirm={() => commentToDelete && deleteRemoteComment.mutate(commentToDelete)}
        />
      </DialogContent>
    </Dialog>
  );

  const renderActions = (isQuestion = false, isRecipe = false) => {
    // Rótulos fixos: só o ícone muda de estado, para nada se mover ao clicar.
    const action = (opts: {
      label: string;
      count?: number;
      icon: React.ReactNode;
      onClick: () => void;
      active?: boolean;
      activeClass: string;
      className?: string;
      title?: string;
    }) => (
      <div className={`flex w-16 shrink-0 flex-col items-center gap-0.5 ${opts.className ?? ""}`}>
        <button
          type="button"
          onClick={opts.onClick}
          aria-label={opts.label}
          aria-pressed={opts.active}
          title={opts.title}
          className={`grid h-10 w-10 place-items-center rounded-full transition ${
            opts.active
              ? opts.activeClass
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {opts.icon}
        </button>
        <span className="whitespace-nowrap text-[10px] leading-none tabular-nums text-muted-foreground">
          {opts.label}
          {opts.count !== undefined && <span className="stat-count"> {opts.count}</span>}
        </span>
      </div>
    );

    return (
      <div className="mt-4 flex flex-nowrap items-start justify-evenly border-t border-border/50 pt-3">
        {isRecipe &&
          action({
            label: t("postcard.prepared"),
            count: preparedCount,
            icon: <ChefHat className="h-4 w-4" />,
            onClick: handlePrepared,
            active: hasPrepared,
            activeClass: "bg-primary-soft text-primary",
          })}

        {action({
          label: t("postcard.conversation"),
          count: post.comments?.length || 0,
          icon: <MessageSquare className="h-4 w-4" />,
          onClick: () => setShowComments((v) => !v),
          active: showComments,
          activeClass: "bg-primary-soft text-primary",
        })}

        {!isQuestion &&
          action({
            label: t("postcard.support"),
            count: supportCount,
            icon: <Heart className={`h-4 w-4 ${hasSupported ? "fill-accent" : ""}`} />,
            onClick: handleSupport,
            active: hasSupported,
            activeClass: "bg-accent-soft text-accent",
          })}
      </div>
    );
  };

  const renderBlocks = (fallback: PostBlock[], blocks: Partial<Record<PostBlock, ReactNode>>) =>
    normalizeBlockOrder(post.blockOrder, fallback).map((b) => (
      <Fragment key={b}>{blocks[b]}</Fragment>
    ));

  const frameClass =
    "rounded-3xl border border-border/80 bg-card shadow-sm transition hover:shadow-md";
  const footer = (isQuestion = false, isRecipe = false) => (
    <>
      {renderActions(isQuestion, isRecipe)}
      {renderCommentsDialog()}
    </>
  );

  // --- RECEITA ---
  if (post.type === "receita") {
    return (
      <PostCardFrame type={post.type} className={frameClass} footer={footer(false, true)}>
        <div
          className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider"
          style={{ color: "color-mix(in srgb, var(--pt) 65%, var(--foreground))" }}
        >
          <ChefHat className="h-4 w-4" /> {t("postcard.communityRecipe")}
        </div>

        {renderAuthorInfo()}

        {renderBlocks(["image", "title", "text", "recipe"], {
          image: displayImage && (
            <PostImage
              src={displayImage}
              alt={t("postcard.altRecipe")}
              className="my-4 w-full rounded-2xl shadow-sm"
            />
          ),
          title: (
            <h3 className="text-base sm:text-lg font-bold font-display leading-snug text-foreground mb-2">
              {post.title}
            </h3>
          ),
          text: (
            <p className="text-sm text-foreground/85 leading-relaxed text-left mb-5">{post.text}</p>
          ),
          recipe: post.recipeData && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 mb-2">
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-foreground mb-4 pb-4 border-b border-border/50">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-accent" /> {post.recipeData.prepTime}
                </span>
                <span>·</span>
                <span>{post.recipeData.servings}</span>
                <span>·</span>
                <span className="text-primary">{td(post.recipeData.difficulty)}</span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("postcard.ingredients")}
                  </h4>
                  <ul className="space-y-2 text-sm text-foreground">
                    {post.recipeData.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-accent font-bold">•</span> <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                  <BuyAtMarket
                    items={post.recipeData.ingredients}
                    source="receita"
                    className="mt-3"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("postcard.preparation")}
                  </h4>
                  <ol className="space-y-3 text-sm text-foreground list-decimal list-inside">
                    {post.recipeData.steps.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="text-foreground/90">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ),
        })}
      </PostCardFrame>
    );
  }

  // --- EXPERIÊNCIA ---
  if (post.type === "experiencia") {
    return (
      <PostCardFrame type={post.type} className={frameClass} footer={footer()}>
        <div
          className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider"
          style={{ color: "color-mix(in srgb, var(--pt) 65%, var(--foreground))" }}
        >
          <Heart className="h-4 w-4" /> {t("postcard.communityStory")}
        </div>

        {renderAuthorInfo()}

        {renderBlocks(["image", "title", "text"], {
          image: displayImage && (
            <PostImage
              src={displayImage}
              alt={t("postcard.altExperience")}
              className="mb-4 w-full rounded-2xl shadow-sm"
            />
          ),
          title: post.title && (
            <h3 className="text-base sm:text-lg font-bold font-display leading-snug text-foreground mb-2">
              {post.title}
            </h3>
          ),
          text: (
            <p className="mb-4 text-sm text-foreground/90 leading-relaxed text-left whitespace-pre-line">
              {post.text}
            </p>
          ),
        })}
      </PostCardFrame>
    );
  }

  // --- PERGUNTA ---
  if (post.type === "pergunta") {
    return (
      <PostCardFrame type={post.type} className={frameClass} footer={footer(true)}>
        <div
          className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider"
          style={{ color: "color-mix(in srgb, var(--pt) 65%, var(--foreground))" }}
        >
          <HelpCircle className="h-4 w-4" /> {t("postcard.question")}
        </div>

        {renderAuthorInfo()}

        {renderBlocks(["title", "text", "image"], {
          image: displayImage && (
            <PostImage
              src={displayImage}
              alt={t("postcard.altPost")}
              className="mb-4 w-full rounded-2xl shadow-sm"
            />
          ),
          title: (
            <h3 className="text-base sm:text-lg font-bold font-display text-foreground mb-2 leading-snug">
              {post.title || post.text}
            </h3>
          ),
          text: post.title && (
            <p className="mb-4 text-sm text-foreground/85 leading-relaxed text-left">{post.text}</p>
          ),
        })}
      </PostCardFrame>
    );
  }

  // --- GERAL (Fallback) ---
  return (
    <PostCardFrame type={post.type} className={frameClass} footer={footer()}>
      {renderAuthorInfo()}
      {renderBlocks(["image", "title", "text"], {
        image: displayImage && (
          <PostImage
            src={displayImage}
            alt={t("postcard.altPost")}
            className="mb-4 w-full rounded-2xl shadow-sm"
          />
        ),
        title: post.title && (
          <h3 className="text-base sm:text-lg font-bold font-display leading-snug text-foreground mb-2">
            {post.title}
          </h3>
        ),
        text: (
          <p className="mb-4 text-sm text-foreground/90 leading-relaxed text-left whitespace-pre-line">
            {post.text}
          </p>
        ),
      })}
    </PostCardFrame>
  );
}

interface WeeklyThemeCardProps {
  theme: RemoteTheme;
  compact?: boolean;
}

/** Cartão do tema da semana (do banco, no idioma da pessoa); a enquete só aparece no modo completo. */
export function WeeklyThemeCard({ theme, compact = false }: WeeklyThemeCardProps) {
  const { t, locale } = useI18n();
  const text = localizeTheme(theme, locale);
  const weekLabel = t("theme.weekOf").replace("{date}", formatWeekStart(theme.weekStart, locale));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-card shadow-card flex flex-col">
      <div className="p-6 sm:p-8 bg-gradient-to-br from-card via-card to-accent-soft/30">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground tracking-wide uppercase">
            <CalendarDays className="h-3.5 w-3.5" /> {text.badge || t("weekly.badge")}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{weekLabel}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-foreground font-display leading-tight">
          {text.title}
        </h2>
        <p className="mt-2 text-sm text-foreground/80 leading-relaxed max-w-2xl">
          {text.description}
        </p>

        {/* Pergunta da Semana */}
        {text.question && (
          <div className="mt-5 rounded-2xl border border-accent/20 bg-card/90 p-4 backdrop-blur-xs">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
              {t("weekly.questionOfWeek")}
            </p>
            <p className="text-sm font-medium text-foreground">“{text.question}”</p>
          </div>
        )}

        {/* Enquete interativa */}
        {!compact && <ThemePoll themeId={theme.id} theme={text} />}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/tema-da-semana"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
          >
            <span>{t("weekly.viewAll")}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface ChallengeCardProps {
  challenge: RemoteChallenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const isJoined = challenge?.joined ?? false;
  const isCompleted = challenge?.completed ?? false;
  const totalSteps = challenge?.steps?.length || 0;
  const completedSteps = challenge?.mySteps.length ?? 0;

  const handleJoin = () => {
    if (!user) {
      toast.info(t("challenge.loginToJoin"));
      return;
    }
    if (isJoined) {
      leave.mutate(challenge.id, { onSuccess: () => toast.info(t("challenge.left")) });
    } else {
      join.mutate(challenge.id, { onSuccess: () => toast.success(t("challenge.joined")) });
    }
  };

  if (!challenge) return null;

  // Só o desafio dos "3 alimentos frescos" tem foto de capa; os demais usam o cabeçalho colorido.
  const challengeImage = /3 alimentos frescos/i.test(challenge.title)
    ? "/images/challenges/salad-bowl.jpg"
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between transition hover:shadow-sm overflow-hidden">
      <div>
        {/* Cover image or colored header */}
        {challengeImage ? (
          <div className="h-28 w-full relative">
            <img
              src={challengeImage}
              alt={challenge.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 grid h-8 w-8 place-items-center rounded-lg bg-card/90 text-accent shadow-xs backdrop-blur-sm">
              <EmojiIcon emoji={challenge.badgeIcon || "🎯"} className="h-4 w-4" />
            </div>
            <div className="absolute top-3 right-3 rounded-full bg-card/90 px-2.5 py-0.5 text-[11px] font-bold text-foreground backdrop-blur-sm shadow-xs">
              {challenge.duration || t("challenge.weekFallback")}
            </div>
            {isCompleted && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs">
                <Award className="h-3 w-3" /> {t("challenge.completed")}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-5 pb-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary shadow-xs">
              <EmojiIcon emoji={challenge.badgeIcon || "🎯"} className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-2">
              {isCompleted && (
                <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold text-primary">
                  <Award className="h-3 w-3" /> {t("challenge.completed")}
                </span>
              )}
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {challenge.duration || t("challenge.weekFallback")}
              </span>
            </div>
          </div>
        )}

        <div className={`px-5 ${challengeImage ? "pt-4" : "pt-2"}`}>
          <Link
            to="/desafios/$challengeId"
            params={{ challengeId: challenge.id }}
            className="text-base font-bold text-foreground font-display hover:text-accent transition"
          >
            {challenge.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {challenge.description}
          </p>
        </div>

        {isJoined && totalSteps > 0 && (
          <div className="mt-4 px-5">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
              <span>{t("challenge.yourProgress")}</span>
              <span>
                {completedSteps}/{totalSteps} {t("challenge.steps")}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-border/60 pt-3 px-5 pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <EmojiIcon emoji="👥" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            {challenge.participantCount} {t("challenge.participating")}
          </span>
          <Link
            to="/desafios/$challengeId"
            params={{ challengeId: challenge.id }}
            className="text-xs font-semibold text-accent hover:underline"
          >
            {t("challenge.viewChallenge")}
          </Link>
        </div>
        <button
          type="button"
          disabled={join.isPending || leave.isPending}
          onClick={handleJoin}
          className={`w-full rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
            isJoined
              ? "bg-primary-soft text-primary font-bold"
              : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-xs"
          }`}
        >
          {isJoined ? t("challenge.joinedLabel") : t("challenge.joinLabel")}
        </button>
      </div>
    </div>
  );
}
