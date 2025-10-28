import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Lock, Zap, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      {/* Hero Section */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            FinanceHub
          </h1>
          <div className="flex gap-4">
            <Link to="/auth">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-20 text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
            ✨ Conecte suas contas em segundos
          </div>
          <h2 className="text-5xl md:text-6xl font-bold max-w-4xl mx-auto leading-tight">
            Suas finanças empresariais{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              unificadas em um só lugar
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Conecte Nubank, Itaú, Santander e visualize todas as transações em um dashboard Power BI profissional.
            Ideal para pequenos empreendedores.
          </p>
          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Começar Agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Ver Demonstração
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Por que escolher o FinanceHub?</h3>
            <p className="text-muted-foreground">Simplifique a gestão financeira do seu negócio</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Conexão Instantânea</CardTitle>
                <CardDescription>
                  Conecte suas contas bancárias via Open Finance em segundos. Suporte para Nubank, Itaú e Santander.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Dashboard Power BI</CardTitle>
                <CardDescription>
                  Template pronto com KPIs essenciais: saldo, entradas, saídas e análise de despesas.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>100% Seguro</CardTitle>
                <CardDescription>
                  Certificado Open Finance. Seus dados bancários protegidos com criptografia de ponta.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-20 bg-muted/20 rounded-3xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Como funciona</h3>
            <p className="text-muted-foreground">3 passos simples para começar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h4 className="font-bold text-lg">Crie sua conta</h4>
              <p className="text-sm text-muted-foreground">
                Cadastro gratuito em menos de 1 minuto
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h4 className="font-bold text-lg">Conecte seus bancos</h4>
              <p className="text-sm text-muted-foreground">
                Autorize via Open Finance de forma segura
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                3
              </div>
              <h4 className="font-bold text-lg">Visualize no Power BI</h4>
              <p className="text-sm text-muted-foreground">
                Use sua API key no template pronto
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Card className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-4xl mb-4">
                Pronto para organizar suas finanças?
              </CardTitle>
              <CardDescription className="text-lg">
                Junte-se a centenas de empreendedores que já simplificaram sua gestão financeira
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Começar Gratuitamente <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                Não precisa cartão de crédito • Suporte em português
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 FinanceHub. Todos os direitos reservados.</p>
          <p className="mt-2">Certificado Open Finance Brasil</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
