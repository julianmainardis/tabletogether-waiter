import type React from "react"
import { TableTogetherLogo } from "./TableTogetherLogo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const LogoShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">TableTogether Logo Showcase</h1>
          <p className="text-gray-600 text-lg">Un logo que conecta personas alrededor de la mesa</p>
        </div>

        {/* Logo principal */}
        <Card>
          <CardHeader>
            <CardTitle>Logo Principal</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-12 bg-white">
            <TableTogetherLogo size="xl" />
          </CardContent>
        </Card>

        {/* Variaciones de tamaño */}
        <Card>
          <CardHeader>
            <CardTitle>Variaciones de Tamaño</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 bg-white">
            <div className="flex items-center justify-around flex-wrap gap-4">
              <div className="text-center">
                <TableTogetherLogo size="sm" />
                <p className="text-sm text-gray-500 mt-2">Pequeño</p>
              </div>
              <div className="text-center">
                <TableTogetherLogo size="md" />
                <p className="text-sm text-gray-500 mt-2">Mediano</p>
              </div>
              <div className="text-center">
                <TableTogetherLogo size="lg" />
                <p className="text-sm text-gray-500 mt-2">Grande</p>
              </div>
              <div className="text-center">
                <TableTogetherLogo size="xl" />
                <p className="text-sm text-gray-500 mt-2">Extra Grande</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variaciones de estilo */}
        <Card>
          <CardHeader>
            <CardTitle>Variaciones de Estilo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 border rounded-lg">
                <TableTogetherLogo variant="full" size="lg" />
                <p className="text-sm text-gray-500 mt-4">Logo Completo</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <TableTogetherLogo variant="icon" size="lg" />
                <p className="text-sm text-gray-500 mt-4">Solo Ícono</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <TableTogetherLogo variant="text" />
                <p className="text-sm text-gray-500 mt-4">Solo Texto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fondos diferentes */}
        <Card>
          <CardHeader>
            <CardTitle>Adaptabilidad de Fondos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-8 rounded-lg border text-center">
                <TableTogetherLogo size="lg" />
                <p className="text-sm text-gray-500 mt-2">Fondo Blanco</p>
              </div>
              <div className="bg-gray-900 p-8 rounded-lg text-center">
                <TableTogetherLogo size="lg" />
                <p className="text-sm text-gray-300 mt-2">Fondo Oscuro</p>
              </div>
              <div className="bg-orange-100 p-8 rounded-lg text-center">
                <TableTogetherLogo size="lg" />
                <p className="text-sm text-gray-600 mt-2">Fondo Naranja Claro</p>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-red-500 p-8 rounded-lg text-center">
                <TableTogetherLogo size="lg" />
                <p className="text-sm text-white mt-2">Fondo Gradiente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aplicaciones del logo */}
        <Card>
          <CardHeader>
            <CardTitle>Aplicaciones Prácticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 bg-white">
            {/* Header de app */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <TableTogetherLogo size="sm" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Header de aplicación</p>
            </div>

            {/* Tarjeta de presentación */}
            <div className="border rounded-lg p-4">
              <div className="bg-white border rounded-lg p-6 max-w-sm">
                <TableTogetherLogo size="md" className="mb-4" />
                <h3 className="font-semibold text-gray-900">Juan Pérez</h3>
                <p className="text-gray-600">Gerente de Restaurante</p>
                <p className="text-sm text-gray-500">juan@tabletogether.com</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">Tarjeta de presentación</p>
            </div>
          </CardContent>
        </Card>

        {/* Concepto del diseño */}
        <Card>
          <CardHeader>
            <CardTitle>Concepto del Diseño</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-900">Elementos del Logo</h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span>
                      <strong>Mesa circular:</strong> Representa la unión y la igualdad
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                    <span>
                      <strong>Personas:</strong> Los comensales conectados
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-200 rounded-full"></div>
                    <span>
                      <strong>Líneas de conexión:</strong> La comunicación y el servicio
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-900">Paleta de Colores</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded border"></div>
                    <span className="text-gray-600">Naranja Principal (#F97316)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded border"></div>
                    <span className="text-gray-600">Naranja Oscuro (#EA580C)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-800 rounded border"></div>
                    <span className="text-gray-600">Gris Oscuro (#1F2937)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-200 rounded border"></div>
                    <span className="text-gray-600">Naranja Claro (#FED7AA)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LogoShowcase
