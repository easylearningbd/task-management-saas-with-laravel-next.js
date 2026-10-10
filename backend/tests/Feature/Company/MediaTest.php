<?php

use App\Models\Media;
use App\Models\Plan;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\User;
use App\Services\MediaService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/* The media library (private disk, the authenticated file route, the plan's storage limit) and
   the Files tab (attach / detach). Storage is faked: nothing touches the real disk. */

beforeEach(function () {
    Storage::fake(MediaService::DISK);
    $this->plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED, 'storage_limit_gb' => '1.00']);
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $this->plan->id])->save();
    }
    $this->projectA = Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->create());
    $this->projectB = Tenancy::instance()->runAs($this->companyB, fn () => Project::factory()->create());
});

function actAsMediaUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

function uploadAs(string $name = 'requirements.png'): UploadedFile
{
    return UploadedFile::fake()->image($name, 40, 40);
}

// ───────────────────────────── upload + list

test('upload → 201: stored on the private disk under media/{company}/{uuid}.{ext}; the client\'s name is display-only; path never exposed', function () {
    actAsMediaUser($this->companyA);

    $data = $this->postJson(route('v1.media.store'), ['file' => uploadAs('../../escape.png')])
        ->assertCreated()
        ->assertJsonPath('data.original_name', 'escape.png')
        ->assertJsonPath('data.is_image', true)
        ->assertJsonPath('data.type_label', 'PNG')
        ->assertJsonMissingPath('data.path')
        ->assertJsonMissingPath('data.disk')
        ->json('data');

    $row = DB::table('media')->where('id', $data['id'])->first();
    expect($row->company_id)->toBe($this->companyA->id)
        ->and($row->disk)->toBe('local')
        ->and($row->path)->toMatch('#^media/'.$this->companyA->id.'/[0-9a-f-]{36}\.png$#')
        ->and($row->uploaded_by)->toBe($this->companyA->id)
        ->and($row->size_bytes)->toBeGreaterThan(0)
        ->and($data['url'])->toEndWith('/api/v1/media/'.$data['id'].'/file');
    Storage::disk('local')->assertExists($row->path);
});

test('the display / download name always ends in the extension detected from the content', function () {
    actAsMediaUser($this->companyA);

    // Plain text dressed up as a program: stored, but offered as .txt — never as an .exe.
    $id = $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->createWithContent('invoice.exe', 'just some text')->mimeType('text/plain')])
        ->assertCreated()
        ->assertJsonPath('data.original_name', 'invoice.txt')
        ->assertJsonPath('data.extension', 'txt')
        ->json('data.id');
    expect($this->get(route('v1.media.file', $id))->headers->get('Content-Disposition'))->toContain('invoice.txt')->not->toContain('.exe');

    // A matching extension is kept as the user spelled it.
    $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->image('Photo.JPEG', 4, 4)])
        ->assertCreated()->assertJsonPath('data.original_name', 'Photo.JPEG');
});

test('a disallowed type → 422 and nothing stored; a file over 10 MB → 422', function () {
    actAsMediaUser($this->companyA);

    $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->create('setup.exe', 10, 'application/x-msdownload')])
        ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'Upload an image, PDF, Word, Excel, PowerPoint, text or CSV file.']);
    $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->create('page.svg', 1, 'image/svg+xml')])->assertUnprocessable();
    $this->postJson(route('v1.media.store'), ['file' => UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')])
        ->assertUnprocessable()->assertJsonValidationErrors(['file']);
    $this->postJson(route('v1.media.store'), [])->assertUnprocessable()->assertJsonValidationErrors(['file' => 'Choose a file to upload.']);

    expect(DB::table('media')->count())->toBe(0)->and(Storage::disk('local')->allFiles())->toBe([]);
});

test('an upload over the plan\'s storage allowance → 422 storage_limit_reached, and nothing is written', function () {
    $this->plan->forceFill(['storage_limit_gb' => '0.01'])->save(); // 10,737,418 bytes
    Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create(['size_bytes' => 10737400]));
    actAsMediaUser($this->companyA);

    $this->postJson(route('v1.media.store'), ['file' => uploadAs()])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'storage_limit_reached')
        ->assertJsonPath('used_bytes', 10737400)
        ->assertJsonPath('limit_bytes', 10737418)
        ->assertJsonStructure(['message', 'code', 'file_bytes', 'errors' => ['file']]);

    expect(DB::table('media')->count())->toBe(1)->and(Storage::disk('local')->allFiles())->toBe([]);
});

test('the library lists only the company\'s files, newest first, searchable, 18 per page', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        Media::factory()->count(19)->create();
        Media::factory()->create(['original_name' => 'requirements.pdf']);
    });
    Tenancy::instance()->runAs($this->companyB, fn () => Media::factory()->create(['original_name' => 'b-secret.pdf']));
    actAsMediaUser($this->companyA);

    $page = $this->getJson(route('v1.media.index'))->assertOk()->assertJsonPath('meta.total', 20)->assertJsonPath('meta.per_page', 18)->assertJsonPath('meta.last_page', 2);
    expect($page->json('data.0.original_name'))->toBe('requirements.pdf');
    expect(collect($this->getJson(route('v1.media.index', ['search' => 'requirements']))->json('data'))->pluck('original_name')->all())->toBe(['requirements.pdf']);
    expect($this->getJson(route('v1.media.index', ['search' => 'b-secret']))->json('data'))->toBe([]);
});

// ───────────────────────────── the file route

test('the file route streams the company\'s own file (inline for images, download on request); another company\'s → 404', function () {
    actAsMediaUser($this->companyA);
    $id = $this->postJson(route('v1.media.store'), ['file' => uploadAs('diagram.png')])->json('data.id');

    $inline = $this->get(route('v1.media.file', $id))->assertOk();
    expect($inline->headers->get('Content-Type'))->toBe('image/png')
        ->and($inline->headers->get('Content-Disposition'))->toStartWith('inline')
        ->and($inline->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        // Never cached by the browser: the next company to sign in there would see it.
        ->and($inline->headers->get('Cache-Control'))->toContain('no-store')->toContain('private');
    expect($this->get(route('v1.media.file', ['media' => $id, 'download' => 1]))->headers->get('Content-Disposition'))->toStartWith('attachment')->toContain('diagram.png');

    actAsMediaUser($this->companyB);
    $this->get(route('v1.media.file', $id))->assertNotFound();
});

test('non-previewable types are always downloaded', function () {
    $media = Tenancy::instance()->runAs($this->companyA, function () {
        Storage::disk('local')->put('media/x/notes.txt', 'plain text');
        $m = Media::factory()->create(['path' => 'media/x/notes.txt', 'mime_type' => 'text/plain', 'extension' => 'txt', 'original_name' => 'notes.txt']);

        return $m;
    });
    actAsMediaUser($this->companyA);

    expect($this->get(route('v1.media.file', $media))->assertOk()->headers->get('Content-Disposition'))->toStartWith('attachment');
});

// ───────────────────────────── files tab

test('attach: 201 the first time, 200 with the same link the second time (idempotent); listed on the project', function () {
    $media = Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create());
    actAsMediaUser($this->companyA);

    $first = $this->postJson(route('v1.projects.files.store', $this->projectA), ['media_id' => $media->id])->assertCreated()->json('data');
    $again = $this->postJson(route('v1.projects.files.store', $this->projectA), ['media_id' => $media->id])->assertOk()->json('data');

    expect($again['id'])->toBe($first['id'])
        ->and($first['media']['id'])->toBe($media->id)
        ->and(DB::table('project_files')->count())->toBe(1);
    $this->getJson(route('v1.projects.files.index', $this->projectA))->assertJsonCount(1, 'data')->assertJsonPath('data.0.media.id', $media->id);
    $this->getJson(route('v1.projects.show', $this->projectA))->assertJsonPath('data.counts.files', 1);
});

test('detaching removes only the link: the media row and file stay in the library', function () {
    actAsMediaUser($this->companyA);
    $mediaId = $this->postJson(route('v1.media.store'), ['file' => uploadAs()])->json('data.id');
    $linkId = $this->postJson(route('v1.projects.files.store', $this->projectA), ['media_id' => $mediaId])->json('data.id');

    $this->deleteJson(route('v1.project-files.destroy', $linkId))->assertNoContent();

    expect(DB::table('project_files')->count())->toBe(0)
        ->and(DB::table('media')->where('id', $mediaId)->whereNull('deleted_at')->exists())->toBeTrue();
    Storage::disk('local')->assertExists(DB::table('media')->where('id', $mediaId)->value('path'));
});

test('deleting media removes the stored file and every project link to it', function () {
    actAsMediaUser($this->companyA);
    $mediaId = $this->postJson(route('v1.media.store'), ['file' => uploadAs()])->json('data.id');
    $path = DB::table('media')->where('id', $mediaId)->value('path');
    $other = Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->create());
    $this->postJson(route('v1.projects.files.store', $this->projectA), ['media_id' => $mediaId])->assertCreated();
    $this->postJson(route('v1.projects.files.store', $other), ['media_id' => $mediaId])->assertCreated();

    $this->deleteJson(route('v1.media.destroy', $mediaId))->assertNoContent();

    Storage::disk('local')->assertMissing($path);
    expect(DB::table('project_files')->where('media_id', $mediaId)->count())->toBe(0)
        ->and(DB::table('media')->where('id', $mediaId)->value('deleted_at'))->not->toBeNull();
    $this->get(route('v1.media.file', $mediaId))->assertNotFound();
});

test('tenant isolation: A can\'t attach B\'s media, attach to B\'s project, detach B\'s link or delete B\'s media', function () {
    [$mediaB, $linkB] = Tenancy::instance()->runAs($this->companyB, function () {
        $media = Media::factory()->create();
        $link = new ProjectFile;
        $link->forceFill(['project_id' => $this->projectB->id, 'media_id' => $media->id])->save();

        return [$media, $link];
    });
    $mediaA = Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create());
    actAsMediaUser($this->companyA);

    $this->postJson(route('v1.projects.files.store', $this->projectA), ['media_id' => $mediaB->id])
        ->assertUnprocessable()->assertJsonValidationErrors(['media_id' => 'That file isn\'t in your media library.']);
    $this->postJson(route('v1.projects.files.store', $this->projectB), ['media_id' => $mediaA->id])->assertNotFound();
    $this->getJson(route('v1.projects.files.index', $this->projectB))->assertNotFound();
    $this->deleteJson(route('v1.project-files.destroy', $linkB))->assertNotFound();
    $this->deleteJson(route('v1.media.destroy', $mediaB))->assertNotFound();

    expect(DB::table('project_files')->where('id', $linkB->id)->exists())->toBeTrue()
        ->and(DB::table('media')->where('id', $mediaB->id)->whereNull('deleted_at')->exists())->toBeTrue();
});

// ───────────────────────────── access

test('a guest gets 401 and a super admin 403 on every media and file route', function (string $method, string $route, string $bound) {
    $media = Tenancy::instance()->runAs($this->companyA, fn () => Media::factory()->create());
    $link = Tenancy::instance()->runAs($this->companyA, function () use ($media) {
        $link = new ProjectFile;
        $link->forceFill(['project_id' => $this->projectA->id, 'media_id' => $media->id])->save();

        return $link;
    });
    $url = route($route, match ($bound) {
        'project' => $this->projectA, 'media' => $media, 'file' => $link, default => []
    });

    $this->json($method, $url, ['media_id' => $media->id])->assertUnauthorized();
    actAsMediaUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, ['media_id' => $media->id])->assertForbidden();

    expect(DB::table('media')->whereNull('deleted_at')->count())->toBe(1)->and(DB::table('project_files')->count())->toBe(1);
})->with([
    'media index' => ['GET', 'v1.media.index', ''],
    'media store' => ['POST', 'v1.media.store', ''],
    'media file' => ['GET', 'v1.media.file', 'media'],
    'media destroy' => ['DELETE', 'v1.media.destroy', 'media'],
    'files index' => ['GET', 'v1.projects.files.index', 'project'],
    'files store' => ['POST', 'v1.projects.files.store', 'project'],
    'file destroy' => ['DELETE', 'v1.project-files.destroy', 'file'],
]);
