import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";
import DeckListPage from "@/pages/DeckListPage";
import QuizPage from "@/pages/QuizPage";
import OverviewPage from "@/pages/OverviewPage";
import WrongPage from "@/pages/WrongPage";
import BookmarkPage from "@/pages/BookmarkPage";
import ImportPage from "@/pages/ImportPage";
import StatsPage from "@/pages/StatsPage";
import BottomNav from "@/components/BottomNav";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { userId, loading } = useAuth();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  if (!userId) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 px-4 pb-20 safe-top">{children}</main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DeckListPage />} />
                    <Route path="/deck/:deckId" element={<OverviewPage />} />
                    <Route path="/quiz/:deckId" element={<QuizPage />} />
                    <Route path="/wrong/:deckId" element={<WrongPage />} />
                    <Route
                      path="/bookmarks/:deckId"
                      element={<BookmarkPage />}
                    />
                    <Route path="/import" element={<ImportPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
