'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeFirebaseData } from '@/scripts/analyze-data';
import { Database, Play } from 'lucide-react';

export default function DataAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysisResults = await analyzeFirebaseData();
      setResults(analysisResults);
    } catch (error) {
      console.error('Analysis failed:', error);
      setResults({ success: false, error: 'Analysis failed' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Firebase Data Schema Analysis
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze your Firebase Firestore data to understand the current schema and template usage.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data Analysis Tool</CardTitle>
            <CardDescription>
              This tool will analyze your templates and journal entries collections to show:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Templates count and field types</li>
                <li>Journal entries count and template usage</li>
                <li>Data distribution per user</li>
                <li>Template usage statistics</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing}
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className={results.success ? "text-green-600" : "text-red-600"}>
                {results.success ? "✅ Analysis Complete" : "❌ Analysis Failed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.success ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-900">Templates</h3>
                      <p className="text-2xl font-bold text-blue-600">{results.templatesCount}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-900">Journal Entries</h3>
                      <p className="text-2xl font-bold text-green-600">{results.journalEntriesCount}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Detailed Analysis</h3>
                    <p className="text-sm text-gray-600">
                      Check the browser console (F12 → Console) for detailed schema analysis including:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
                      <li>Template names, fields, and field types</li>
                      <li>Journal entry titles and template associations</li>
                      <li>User distribution and template usage patterns</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <p>Error: {results.error}</p>
                  <p className="text-sm mt-2">
                    Make sure you're logged in and have access to your Firebase data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Data Schema Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Templates Collection</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`{
  "id": "template_document_id",
  "name": "Template Name",
  "description": "Template description",
  "fields": [
    {
      "name": "field_name",
      "type": "text|textarea|boolean|mantra|table",
      "label": "Field Label",
      "placeholder": "Field placeholder",
      "required": boolean
    }
  ],
  "userId": "user_id",
  "createdAt": "firebase_timestamp",
  "isDefault": boolean (optional)
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold">Journal Entries Collection</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`{
  "id": "entry_document_id",
  "title": "Entry Title",
  "content": "Entry content text",
  "userId": "user_id",
  "templateId": "template_id (optional)",
  "templateFields": {
    "field_name": "field_value"
  },
  "createdAt": "firebase_timestamp"
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 