<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Demonstrate a feature test that sends a request through the Laravel application. */
class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        // Act: simulate a browser GET request to the home route.
        $response = $this->get('/');

        // Assert: HTTP 200 means Laravel handled the request successfully.
        $response->assertStatus(200);
    }
}
