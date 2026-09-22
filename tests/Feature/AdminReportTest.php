<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\AdminReportController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/** Verify that every supported report builder returns the same frontend response contract. */
class AdminReportTest extends TestCase
{
    // Give each test a migrated, isolated database and roll it back afterward.
    use RefreshDatabase;

    /** Ensure all report types can be generated even when their database tables are empty. */
    public function test_every_admin_report_can_be_built_from_the_database(): void
    {
        // Resolve the controller through Laravel's container, like obtaining an injected service.
        $controller = app(AdminReportController::class);
        $reports = ['appointments', 'doctors', 'patients', 'payments', 'refunds', 'earnings', 'medical-records', 'audit', 'date-summary'];

        // Run the same contract assertions against every report key.
        foreach ($reports as $report) {
            // Request::create builds an in-memory request without starting a real HTTP server.
            $response = $controller->show(Request::create('/', 'GET', ['period' => 'monthly']), $report);
            $payload = $response->getData(true);

            // The report name is passed as the assertion message to identify failures quickly.
            $this->assertTrue($payload['success'], $report);
            $this->assertArrayHasKey('stats', $payload, $report);
            $this->assertArrayHasKey('rows', $payload, $report);
            $this->assertArrayHasKey('meta', $payload, $report);
        }
    }
}
